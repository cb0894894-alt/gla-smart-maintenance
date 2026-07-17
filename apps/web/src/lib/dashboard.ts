import type { Asset } from "@/lib/assets/google-sheets";
import type { IndicatorRecord } from "@/lib/indicators/google-sheets";
import { getLatestPeriodVariation } from "@/lib/indicators/google-sheets";
import type { InventoryItem } from "@/lib/inventory/google-sheets";
import { getInventoryIndicators } from "@/lib/inventory/google-sheets";
import type { MaintenanceHistoryRecord } from "@/lib/maintenance-history/google-sheets";
import { getMaintenanceHistoryIndicators } from "@/lib/maintenance-history/google-sheets";
import type { PreventivePlan } from "@/lib/preventive-maintenance/google-sheets";
import { getPreventiveIndicators } from "@/lib/preventive-maintenance/google-sheets";
import type { WorkOrder } from "@/lib/work-orders/google-sheets";

const CLOSED_WORK_ORDER_STATUSES = new Set(["cerrada", "cancelada"]);
const URGENT_PRIORITIES = new Set(["alta", "crítica", "critica"]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function isOpenWorkOrder(order: WorkOrder) {
  return !CLOSED_WORK_ORDER_STATUSES.has(normalize(order.estado));
}

export function isUrgentWorkOrder(order: WorkOrder) {
  return URGENT_PRIORITIES.has(normalize(order.prioridad));
}

export function isOverdueWorkOrder(order: WorkOrder, now = new Date()) {
  const reportedAt = parseDate(order.fechaHoraReporte);
  if (!reportedAt || !isOpenWorkOrder(order)) return false;
  const ageHours = (now.getTime() - reportedAt.getTime()) / 36e5;
  return ageHours > (isUrgentWorkOrder(order) ? 24 : 72);
}

export function getWorkOrderDashboardMetrics(
  orders: WorkOrder[],
  now = new Date(),
) {
  return {
    abiertas: orders.filter(isOpenWorkOrder).length,
    urgentes: orders.filter(
      (order) => isOpenWorkOrder(order) && isUrgentWorkOrder(order),
    ).length,
    vencidas: orders.filter((order) => isOverdueWorkOrder(order, now)).length,
  };
}

export function getAssetDashboardMetrics(assets: Asset[]) {
  return {
    total: assets.length,
    operando: assets.filter((asset) => normalize(asset.estado) === "operando")
      .length,
  };
}

export function getPreventiveDashboardMetrics(
  plans: PreventivePlan[],
  today = new Date(),
) {
  const indicators = getPreventiveIndicators(plans, today);
  const cumplimiento = plans.length
    ? Math.round((indicators.completados / plans.length) * 100)
    : 0;
  return {
    cumplimiento,
    proximos: indicators.proximos,
    vencidos: indicators.vencidos,
  };
}

export function getInventoryDashboardMetrics(items: InventoryItem[]) {
  const indicators = getInventoryIndicators(items);
  return {
    total: indicators.total,
    bajas: indicators.bajas,
    agotadas: indicators.agotadas,
  };
}

export function getHistoryDashboardMetrics(
  records: MaintenanceHistoryRecord[],
) {
  const indicators = getMaintenanceHistoryIndicators(records);
  return {
    servicios: indicators.totalServicios,
    horasParo: indicators.horasParo,
    costo: indicators.costoTotal,
  };
}

export function getIndicatorDashboardMetrics(records: IndicatorRecord[]) {
  const latest = getLatestPeriodVariation(records).current;
  return {
    periodo: latest?.periodo || "",
    disponibilidad: latest?.disponibilidadPct ?? 0,
    mtbf: latest?.mtbfHoras ?? 0,
    mttr: latest?.mttrHoras ?? 0,
    cumplimientoPreventivo: latest?.cumplimientoPreventivoPct ?? 0,
  };
}

export function getPriorityWorkOrders(orders: WorkOrder[], now = new Date()) {
  return orders
    .filter(isOpenWorkOrder)
    .sort((a, b) => {
      const priorityScore =
        Number(isUrgentWorkOrder(b)) - Number(isUrgentWorkOrder(a));
      if (priorityScore) return priorityScore;
      const overdueScore =
        Number(isOverdueWorkOrder(b, now)) - Number(isOverdueWorkOrder(a, now));
      if (overdueScore) return overdueScore;
      return (
        (parseDate(a.fechaHoraReporte)?.getTime() ?? 0) -
        (parseDate(b.fechaHoraReporte)?.getTime() ?? 0)
      );
    })
    .slice(0, 5);
}

export function getCriticalInventory(items: InventoryItem[]) {
  return items
    .filter((item) => item.existencia <= item.stockMinimo)
    .sort(
      (a, b) =>
        a.existencia - b.existencia || a.refaccion.localeCompare(b.refaccion),
    )
    .slice(0, 5);
}

export function getUpcomingPreventivePlans(
  plans: PreventivePlan[],
  today = new Date(),
) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return plans
    .filter((plan) => normalize(plan.estado) === "activo")
    .filter((plan) => {
      const date = parseDate(plan.proximaEjecucion);
      return date ? date >= start : false;
    })
    .sort(
      (a, b) =>
        (parseDate(a.proximaEjecucion)?.getTime() ?? 0) -
        (parseDate(b.proximaEjecucion)?.getTime() ?? 0),
    )
    .slice(0, 5);
}

export function getRecentMaintenanceActivity(
  records: MaintenanceHistoryRecord[],
) {
  return [...records]
    .sort(
      (a, b) =>
        (parseDate(b.fechaCierre)?.getTime() ?? 0) -
        (parseDate(a.fechaCierre)?.getTime() ?? 0),
    )
    .slice(0, 5);
}
