import type { Asset } from "@/lib/assets/google-sheets";

export const WORK_ORDER_PRIORITIES = [
  "Baja",
  "Media",
  "Alta",
  "Crítica",
] as const;
export const EQUIPMENT_CONDITIONS = [
  "Operando",
  "Operando con restricción",
  "Detenido",
] as const;
export const WORK_ORDER_STATUSES = [
  "Abierta",
  "Asignada",
  "En proceso",
  "En espera",
  "Cerrada",
  "Cancelada",
] as const;

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export type FailureReportInput = {
  assetCode: string;
  assetName: string;
  assetArea: string;
  assetCriticality: string;
  reporter: string;
  description: string;
  priority: WorkOrderPriority;
  equipmentCondition: EquipmentCondition;
  reportedAt: string;
  observations?: string;
};

export type WorkOrder = {
  folio: string;
  fechaHoraReporte: string;
  codigoActivo: string;
  activo: string;
  area: string;
  criticidad: string;
  reporta: string;
  descripcionFalla: string;
  prioridad: string;
  condicionEquipo: string;
  observaciones: string;
  estado: string;
  origen: string;
  notaCierre?: string;
  fechaHoraActualizacion?: string;
};

export type WorkOrderFilters = {
  search: string;
  estado: string;
  prioridad: string;
  area: string;
};

export type CreateWorkOrderResult = {
  folio: string;
  estado: "Abierta" | string;
};
export type UpdateWorkOrderStatusInput = {
  folio: string;
  estado: WorkOrderStatus;
  notaCierre?: string;
};

const FIELD_ALIASES: Record<keyof WorkOrder, string[]> = {
  folio: ["folio"],
  fechaHoraReporte: ["fechahorareporte", "fecha", "fecha reporte"],
  codigoActivo: ["codigoactivo", "codigo activo", "código activo"],
  activo: ["activo", "equipo"],
  area: ["area", "área"],
  criticidad: ["criticidad"],
  reporta: ["reporta", "reportado por", "persona que reporta"],
  descripcionFalla: [
    "descripcionfalla",
    "descripción falla",
    "descripcion falla",
  ],
  prioridad: ["prioridad"],
  condicionEquipo: ["condicionequipo", "condición equipo", "condicion equipo"],
  observaciones: ["observaciones"],
  estado: ["estado"],
  origen: ["origen"],
  notaCierre: ["notacierre", "nota cierre"],
  fechaHoraActualizacion: [
    "fechahoraactualizacion",
    "fecha actualizacion",
    "fecha actualización",
  ],
};

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function readField(record: Record<string, unknown>, field: keyof WorkOrder) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}
function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");
  return apiUrl;
}
export function getWorkOrdersApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "ordenesTrabajo");
  return url.toString();
}
export function buildFailureReportPayload(
  input: FailureReportInput,
): FailureReportInput & { accion: "crearOrdenTrabajo" } {
  return {
    accion: "crearOrdenTrabajo",
    ...input,
    reporter: input.reporter.trim(),
    description: input.description.trim(),
    observations: input.observations?.trim() || "",
  };
}
export function getAssetLabel(asset: Asset) {
  return [asset.codigo, asset.nombre].filter(Boolean).join(" · ");
}
export function validateFailureReport(input: FailureReportInput) {
  const errors: Partial<Record<keyof FailureReportInput, string>> = {};
  if (!input.assetCode) errors.assetCode = "Selecciona un activo.";
  if (!input.reporter.trim())
    errors.reporter = "Indica quién reporta la falla.";
  if (!input.description.trim())
    errors.description = "Describe claramente la falla.";
  if (!input.priority) errors.priority = "Selecciona la prioridad.";
  if (!input.equipmentCondition)
    errors.equipmentCondition = "Selecciona la condición del equipo.";
  return errors;
}
export function parseWorkOrdersResponse(data: unknown): WorkOrder[] {
  if (!Array.isArray(data))
    throw new Error("La API no devolvió una lista de órdenes de trabajo.");
  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      folio: readField(item, "folio"),
      fechaHoraReporte: readField(item, "fechaHoraReporte"),
      codigoActivo: readField(item, "codigoActivo"),
      activo: readField(item, "activo"),
      area: readField(item, "area"),
      criticidad: readField(item, "criticidad"),
      reporta: readField(item, "reporta"),
      descripcionFalla: readField(item, "descripcionFalla"),
      prioridad: readField(item, "prioridad"),
      condicionEquipo: readField(item, "condicionEquipo"),
      observaciones: readField(item, "observaciones"),
      estado: readField(item, "estado"),
      origen: readField(item, "origen"),
      notaCierre: readField(item, "notaCierre"),
      fechaHoraActualizacion: readField(item, "fechaHoraActualizacion"),
    }))
    .filter((order) => order.folio);
}
export async function fetchWorkOrders() {
  const response = await fetch(getWorkOrdersApiUrl());
  if (!response.ok)
    throw new Error(`La API de OT respondió con ${response.status}.`);
  return parseWorkOrdersResponse(await response.json());
}
export function filterWorkOrders(
  orders: WorkOrder[],
  filters: WorkOrderFilters,
) {
  const query = filters.search.trim().toLowerCase();
  return orders.filter((order) => {
    const matchesSearch =
      !query ||
      [order.folio, order.activo, order.reporta].some((value) =>
        value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (!filters.estado || order.estado === filters.estado) &&
      (!filters.prioridad || order.prioridad === filters.prioridad) &&
      (!filters.area || order.area === filters.area)
    );
  });
}
export function getWorkOrderIndicators(orders: WorkOrder[]) {
  return {
    total: orders.length,
    abiertas: orders.filter((o) => o.estado === "Abierta").length,
    enProceso: orders.filter((o) => o.estado === "En proceso").length,
    cerradas: orders.filter((o) => o.estado === "Cerrada").length,
    prioridadCritica: orders.filter((o) => o.prioridad === "Crítica").length,
  };
}
export function validateStatusUpdate(input: UpdateWorkOrderStatusInput) {
  if (!input.folio) return "Selecciona una OT.";
  if (!WORK_ORDER_STATUSES.includes(input.estado))
    return "Selecciona un estado válido.";
  if (input.estado === "Cerrada" && !input.notaCierre?.trim())
    return "Para cerrar una OT debes capturar una nota breve de cierre.";
  return null;
}
export async function createWorkOrderFromFailure(input: FailureReportInput) {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(buildFailureReportPayload(input)),
  });
  if (!response.ok) throw new Error(`La API respondió con ${response.status}.`);
  const data = (await response.json()) as Partial<CreateWorkOrderResult> & {
    ok?: boolean;
    error?: string;
  };
  if (data.ok === false || !data.folio)
    throw new Error(data.error || "La API no confirmó el folio de la OT.");
  return { folio: data.folio, estado: data.estado || "Abierta" };
}
export async function updateWorkOrderStatus(input: UpdateWorkOrderStatusInput) {
  const validationError = validateStatusUpdate(input);
  if (validationError) throw new Error(validationError);
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      accion: "actualizarEstadoOrdenTrabajo",
      folio: input.folio,
      estado: input.estado,
      notaCierre: input.notaCierre?.trim() || "",
    }),
  });
  if (!response.ok) throw new Error(`La API respondió con ${response.status}.`);
  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    folio?: string;
    estado?: string;
  };
  if (data.ok === false)
    throw new Error(data.error || "La API no pudo actualizar la OT.");
  return data;
}
