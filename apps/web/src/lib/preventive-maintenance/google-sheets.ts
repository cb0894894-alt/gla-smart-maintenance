import type { Asset } from "@/lib/assets/google-sheets";

export const PM_STATUSES = [
  "Activo",
  "Pausado",
  "Completado",
  "Cancelado",
] as const;
export const PM_PRIORITIES = ["Baja", "Media", "Alta", "Crítica"] as const;
export const PM_FREQUENCY_UNITS = ["Días", "Semanas", "Meses", "Años"] as const;

export type PreventiveMaintenanceStatus = (typeof PM_STATUSES)[number];
export type PreventiveMaintenancePriority = (typeof PM_PRIORITIES)[number];
export type PreventiveMaintenanceFrequencyUnit =
  (typeof PM_FREQUENCY_UNITS)[number];

export type PreventivePlan = {
  idPM: string;
  codigoActivo: string;
  activo: string;
  area: string;
  tarea: string;
  frecuencia: string;
  unidadFrecuencia: string;
  ultimaEjecucion: string;
  proximaEjecucion: string;
  responsable: string;
  estado: string;
  prioridad: string;
  duracionEstimada: string;
  instrucciones: string;
  observaciones: string;
  fechaCreacion: string;
  fechaActualizacion: string;
};

export type PreventivePlanFilters = {
  search: string;
  estado: string;
  prioridad: string;
  area: string;
};

export type CreatePreventivePlanInput = {
  assetCode: string;
  assetName: string;
  assetArea: string;
  tarea: string;
  frecuencia: number;
  unidadFrecuencia: PreventiveMaintenanceFrequencyUnit;
  ultimaEjecucion: string;
  responsable: string;
  prioridad: PreventiveMaintenancePriority;
  duracionEstimada: string;
  instrucciones: string;
  observaciones?: string;
};

export type RegisterPreventiveExecutionInput = {
  idPM: string;
  fechaEjecucion: string;
  observaciones?: string;
};

const FIELD_ALIASES: Record<keyof PreventivePlan, string[]> = {
  idPM: ["idpm", "id pm"],
  codigoActivo: ["codigoactivo", "codigo activo", "código activo"],
  activo: ["activo", "equipo"],
  area: ["area", "área"],
  tarea: ["tarea"],
  frecuencia: ["frecuencia"],
  unidadFrecuencia: ["unidadfrecuencia", "unidad frecuencia"],
  ultimaEjecucion: ["ultimaejecucion", "ultima ejecucion", "última ejecución"],
  proximaEjecucion: [
    "proximaejecucion",
    "proxima ejecucion",
    "próxima ejecución",
  ],
  responsable: ["responsable"],
  estado: ["estado"],
  prioridad: ["prioridad"],
  duracionEstimada: [
    "duracionestimada",
    "duracion estimada",
    "duración estimada",
  ],
  instrucciones: ["instrucciones"],
  observaciones: ["observaciones"],
  fechaCreacion: ["fechacreacion", "fecha creacion", "fecha creación"],
  fechaActualizacion: [
    "fechaactualizacion",
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

const CALENDAR_DATE_FIELDS = new Set<keyof PreventivePlan>([
  "ultimaEjecucion",
  "proximaEjecucion",
]);

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function toCalendarDate(value: unknown) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    const match = text.match(CALENDAR_DATE_PATTERN);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return text;
  }

  return "";
}

function readField(
  record: Record<string, unknown>,
  field: keyof PreventivePlan,
) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;
  if (CALENDAR_DATE_FIELDS.has(field)) return toCalendarDate(value);
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

export function getPreventivePlansApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "preventivos");
  return url.toString();
}

export function calculateNextExecution(
  dateValue: string,
  frequency: number,
  unit: string,
) {
  const calendarDate = toCalendarDate(dateValue);
  const match = calendarDate.match(CALENDAR_DATE_PATTERN);
  if (!match || !Number.isFinite(frequency) || frequency < 1) return "";

  const next = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (unit === "Días") next.setDate(next.getDate() + frequency);
  else if (unit === "Semanas") next.setDate(next.getDate() + frequency * 7);
  else if (unit === "Meses") next.setMonth(next.getMonth() + frequency);
  else if (unit === "Años") next.setFullYear(next.getFullYear() + frequency);
  else return "";
  return toCalendarDate(next);
}

export function parsePreventivePlansResponse(data: unknown): PreventivePlan[] {
  if (!Array.isArray(data))
    throw new Error("La API no devolvió una lista de preventivos.");
  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      idPM: readField(item, "idPM"),
      codigoActivo: readField(item, "codigoActivo"),
      activo: readField(item, "activo"),
      area: readField(item, "area"),
      tarea: readField(item, "tarea"),
      frecuencia: readField(item, "frecuencia"),
      unidadFrecuencia: readField(item, "unidadFrecuencia"),
      ultimaEjecucion: readField(item, "ultimaEjecucion"),
      proximaEjecucion: readField(item, "proximaEjecucion"),
      responsable: readField(item, "responsable"),
      estado: readField(item, "estado"),
      prioridad: readField(item, "prioridad"),
      duracionEstimada: readField(item, "duracionEstimada"),
      instrucciones: readField(item, "instrucciones"),
      observaciones: readField(item, "observaciones"),
      fechaCreacion: readField(item, "fechaCreacion"),
      fechaActualizacion: readField(item, "fechaActualizacion"),
    }))
    .filter((plan) => plan.idPM);
}

export async function fetchPreventivePlans() {
  const response = await fetch(getPreventivePlansApiUrl());
  if (!response.ok)
    throw new Error(`La API de preventivos respondió con ${response.status}.`);
  return parsePreventivePlansResponse(await response.json());
}

export function filterPreventivePlans(
  plans: PreventivePlan[],
  filters: PreventivePlanFilters,
) {
  const query = filters.search.trim().toLowerCase();
  return plans.filter((plan) => {
    const matchesSearch =
      !query ||
      [
        plan.idPM,
        plan.codigoActivo,
        plan.activo,
        plan.tarea,
        plan.responsable,
      ].some((value) => value.toLowerCase().includes(query));
    return (
      matchesSearch &&
      (!filters.estado || plan.estado === filters.estado) &&
      (!filters.prioridad || plan.prioridad === filters.prioridad) &&
      (!filters.area || plan.area === filters.area)
    );
  });
}

export function getPreventiveIndicators(
  plans: PreventivePlan[],
  today = new Date(),
) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const nextLimit = new Date(start);
  nextLimit.setDate(nextLimit.getDate() + 7);
  const active = plans.filter((p) => p.estado === "Activo");
  return {
    total: plans.length,
    activos: active.length,
    vencidos: active.filter((p) =>
      isDateInRange(p.proximaEjecucion, undefined, start, true),
    ).length,
    proximos: active.filter((p) =>
      isDateInRange(p.proximaEjecucion, start, nextLimit),
    ).length,
    completados: plans.filter((p) => p.estado === "Completado").length,
  };
}

function isDateInRange(
  value: string,
  min: Date | undefined,
  max: Date,
  beforeMax = false,
) {
  const calendarDate = toCalendarDate(value);
  const match = calendarDate.match(CALENDAR_DATE_PATTERN);
  if (!match) return false;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (beforeMax) return date < max;
  return (!min || date >= min) && date <= max;
}

export function getAssetLabel(asset: Asset) {
  return [asset.codigo, asset.nombre].filter(Boolean).join(" · ");
}

export function validatePreventivePlan(input: CreatePreventivePlanInput) {
  const errors: Partial<Record<keyof CreatePreventivePlanInput, string>> = {};
  if (!input.assetCode) errors.assetCode = "Selecciona un activo real.";
  if (!input.tarea.trim()) errors.tarea = "Describe la tarea preventiva.";
  if (!input.responsable.trim()) errors.responsable = "Indica el responsable.";
  if (!Number.isFinite(input.frecuencia) || input.frecuencia < 1)
    errors.frecuencia = "Frecuencia debe ser mayor a cero.";
  if (!input.ultimaEjecucion)
    errors.ultimaEjecucion = "Captura la última ejecución.";
  return errors;
}

export async function createPreventivePlan(input: CreatePreventivePlanInput) {
  const errors = validatePreventivePlan(input);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      accion: "crearPreventivo",
      ...input,
      ultimaEjecucion: toCalendarDate(input.ultimaEjecucion),
      tarea: input.tarea.trim(),
      responsable: input.responsable.trim(),
      observaciones: input.observaciones?.trim() || "",
    }),
  });
  if (!response.ok) throw new Error(`La API respondió con ${response.status}.`);
  const data = (await response.json()) as {
    ok?: boolean;
    error?: string;
    idPM?: string;
  };
  if (data.ok === false || !data.idPM)
    throw new Error(data.error || "La API no confirmó el IdPM.");
  return data;
}

export async function registerPreventiveExecution(
  input: RegisterPreventiveExecutionInput,
) {
  if (!input.idPM) throw new Error("Selecciona un plan preventivo.");
  if (!input.fechaEjecucion) throw new Error("Captura la fecha de ejecución.");
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      accion: "registrarEjecucionPreventivo",
      idPM: input.idPM,
      fechaEjecucion: toCalendarDate(input.fechaEjecucion),
      observaciones: input.observaciones?.trim() || "",
    }),
  });
  if (!response.ok) throw new Error(`La API respondió con ${response.status}.`);
  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (data.ok === false)
    throw new Error(data.error || "La API no pudo registrar la ejecución.");
  return data;
}
