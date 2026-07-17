"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAssets, type Asset } from "@/lib/assets/google-sheets";
import {
  getAssetDashboardMetrics,
  getCriticalInventory,
  getHistoryDashboardMetrics,
  getIndicatorDashboardMetrics,
  getInventoryDashboardMetrics,
  getPreventiveDashboardMetrics,
  getPriorityWorkOrders,
  getRecentMaintenanceActivity,
  getUpcomingPreventivePlans,
  getWorkOrderDashboardMetrics,
} from "@/lib/dashboard";
import {
  fetchIndicators,
  type IndicatorRecord,
} from "@/lib/indicators/google-sheets";
import {
  fetchInventory,
  type InventoryItem,
} from "@/lib/inventory/google-sheets";
import {
  fetchMaintenanceHistory,
  type MaintenanceHistoryRecord,
} from "@/lib/maintenance-history/google-sheets";
import {
  fetchPreventivePlans,
  type PreventivePlan,
} from "@/lib/preventive-maintenance/google-sheets";
import {
  fetchWorkOrders,
  type WorkOrder,
} from "@/lib/work-orders/google-sheets";

type ResourceKey =
  | "activos"
  | "ordenes"
  | "preventivos"
  | "inventario"
  | "historial"
  | "indicadores";
type DashboardData = {
  activos: Asset[];
  ordenes: WorkOrder[];
  preventivos: PreventivePlan[];
  inventario: InventoryItem[];
  historial: MaintenanceHistoryRecord[];
  indicadores: IndicatorRecord[];
};
const emptyData: DashboardData = {
  activos: [],
  ordenes: [],
  preventivos: [],
  inventario: [],
  historial: [],
  indicadores: [],
};
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [errors, setErrors] = useState<Partial<Record<ResourceKey, string>>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetchAssets(),
      fetchWorkOrders(),
      fetchPreventivePlans(),
      fetchInventory(),
      fetchMaintenanceHistory(),
      fetchIndicators(),
    ] as const);
    const keys: ResourceKey[] = [
      "activos",
      "ordenes",
      "preventivos",
      "inventario",
      "historial",
      "indicadores",
    ];
    const nextData = { ...emptyData };
    const nextErrors: Partial<Record<ResourceKey, string>> = {};
    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === "fulfilled") nextData[key] = result.value as never;
      else
        nextErrors[key] =
          result.reason instanceof Error
            ? result.reason.message
            : "No se pudo cargar el módulo.";
    });
    setData(nextData);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(
    () => ({
      assets: getAssetDashboardMetrics(data.activos),
      workOrders: getWorkOrderDashboardMetrics(data.ordenes),
      preventive: getPreventiveDashboardMetrics(data.preventivos),
      inventory: getInventoryDashboardMetrics(data.inventario),
      history: getHistoryDashboardMetrics(data.historial),
      indicators: getIndicatorDashboardMetrics(data.indicadores),
    }),
    [data],
  );
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 bg-primary/15 text-primary">
              Datos reales desde Google Sheets
            </Badge>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Centro de mantenimiento inteligente
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Dashboard operativo conectado a Activos, OT, Preventivos,
              Inventario, Historial e Indicadores.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Última actualización:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleString("es-MX")
                : "Sin actualizar"}
            </p>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Actualizar
          </button>
        </header>

        {hasErrors ? (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Error parcial:{" "}
            {Object.entries(errors)
              .map(([key]) => key)
              .join(", ")}
            . Los módulos disponibles continúan visibles.{" "}
            <button className="underline" onClick={loadDashboard}>
              Reintentar
            </button>
          </div>
        ) : null}
        {loading ? (
          <p className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-muted-foreground">
            Cargando información real de Google Sheets...
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            href="/activos"
            title="Activos"
            value={metrics.assets.total}
            detail={`${metrics.assets.operando} activos operando`}
            empty={!loading && !data.activos.length}
          />
          <MetricCard
            href="/ordenes-trabajo"
            title="Órdenes de trabajo"
            value={metrics.workOrders.abiertas}
            detail={`${metrics.workOrders.urgentes} urgentes · ${metrics.workOrders.vencidas} vencidas`}
            empty={!loading && !data.ordenes.length}
          />
          <MetricCard
            href="/mantenimiento-preventivo"
            title="Mantenimiento preventivo"
            value={`${metrics.preventive.cumplimiento}%`}
            detail={`${metrics.preventive.proximos} próximos · ${metrics.preventive.vencidos} vencidos`}
            empty={!loading && !data.preventivos.length}
          />
          <MetricCard
            href="/inventario"
            title="Inventario"
            value={metrics.inventory.total}
            detail={`${metrics.inventory.bajas} existencias bajas · ${metrics.inventory.agotadas} agotadas`}
            empty={!loading && !data.inventario.length}
          />
          <MetricCard
            href="/historial"
            title="Historial"
            value={metrics.history.servicios}
            detail={`${metrics.history.horasParo} h paro · ${formatCurrency(metrics.history.costo)}`}
            empty={!loading && !data.historial.length}
          />
          <MetricCard
            href="/indicadores"
            title="Indicadores"
            value={`${metrics.indicators.disponibilidad}%`}
            detail={`MTBF ${metrics.indicators.mtbf} h · MTTR ${metrics.indicators.mttr} h${metrics.indicators.periodo ? ` · ${metrics.indicators.periodo}` : ""}`}
            empty={!loading && !data.indicadores.length}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ListCard
            title="Órdenes prioritarias"
            href="/ordenes-trabajo"
            empty={!data.ordenes.length}
          >
            {getPriorityWorkOrders(data.ordenes).map((o) => (
              <Row
                key={o.folio}
                main={`${o.folio} · ${o.activo}`}
                meta={`${o.prioridad} · ${o.estado} · ${o.fechaHoraReporte}`}
              />
            ))}
          </ListCard>
          <ListCard
            title="Inventario crítico"
            href="/inventario"
            empty={!data.inventario.length}
            icon={<AlertTriangle className="h-5 w-5 text-amber-300" />}
          >
            {getCriticalInventory(data.inventario).map((i) => (
              <Row
                key={i.codigo}
                main={`${i.codigo} · ${i.refaccion}`}
                meta={`${i.existencia}/${i.stockMinimo} ${i.unidad} · ${i.ubicacion}`}
              />
            ))}
          </ListCard>
          <ListCard
            title="Próximos mantenimientos preventivos"
            href="/mantenimiento-preventivo"
            empty={!data.preventivos.length}
          >
            {getUpcomingPreventivePlans(data.preventivos).map((p) => (
              <Row
                key={p.idPM}
                main={`${p.idPM} · ${p.activo}`}
                meta={`${p.proximaEjecucion} · ${p.tarea} · ${p.responsable}`}
              />
            ))}
          </ListCard>
          <ListCard
            title="Actividad reciente"
            href="/historial"
            empty={!data.historial.length}
          >
            {getRecentMaintenanceActivity(data.historial).map((h) => (
              <Row
                key={h.idHistorial || h.folioOT}
                main={`${h.folioOT} · ${h.activo}`}
                meta={`${h.fechaCierre} · ${h.tipoMantenimiento} · ${formatCurrency(h.costoTotal)}`}
              />
            ))}
          </ListCard>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  href,
  title,
  value,
  detail,
  empty,
}: {
  href: string;
  title: string;
  value: string | number;
  detail: string;
  empty: boolean;
}) {
  return (
    <Link href={href} className="rounded-xl">
      <Card className="h-full bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.07]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Badge className="text-primary">Ver módulo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-black">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {empty ? "Sin datos disponibles" : detail}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
function ListCard({
  title,
  href,
  empty,
  icon,
  children,
}: {
  title: string;
  href: string;
  empty: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <Link className="text-sm text-primary underline" href={href}>
            Abrir
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {empty ? (
          <p className="text-sm text-muted-foreground">
            Sin datos disponibles.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
function Row({ main, meta }: { main: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <strong>{main}</strong>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
