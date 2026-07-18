export type MaintenanceHistoryRecord = {
  idHistorial: string;
  folioOT: string;
  fechaCierre: string;
  codigoActivo: string;
  activo: string;
  tipoMantenimiento: string;
  fallaDetectada: string;
  trabajoRealizado: string;
  tecnico: string;
  tiempoParoHoras: number;
  costoRefacciones: number;
  costoManoObra: number;
  costoTotal: number;
  estadoFinal: string;
  observaciones: string;
};

export type MaintenanceHistoryFilters = {
  search: string;
  tipoMantenimiento: string;
  tecnico: string;
  estadoFinal: string;
};

const FIELD_ALIASES: Record<keyof MaintenanceHistoryRecord, string[]> = {
  idHistorial: ["idhistorial", "id historial"],
  folioOT: ["folioot", "folio ot"],
  fechaCierre: ["fechacierre", "fecha cierre"],
  codigoActivo: ["codigoactivo", "codigo activo", "código activo"],
  activo: ["activo"],
  tipoMantenimiento: ["tipomantenimiento", "tipo mantenimiento"],
  fallaDetectada: ["falladetectada", "falla detectada"],
  trabajoRealizado: ["trabajorealizado", "trabajo realizado"],
  tecnico: ["tecnico", "técnico"],
  tiempoParoHoras: ["tiempoparohoras", "tiempo paro horas"],
  costoRefacciones: ["costorefacciones", "costo refacciones"],
  costoManoObra: ["costomanoobra", "costo mano obra"],
  costoTotal: ["costototal", "costo total"],
  estadoFinal: ["estadofinal", "estado final"],
  observaciones: ["observaciones"],
};

const NUMERIC_FIELDS = new Set<keyof MaintenanceHistoryRecord>([
  "tiempoParoHoras",
  "costoRefacciones",
  "costoManoObra",
  "costoTotal",
]);

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readField(
  record: Record<string, unknown>,
  field: keyof MaintenanceHistoryRecord,
) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;

  if (NUMERIC_FIELDS.has(field)) return parseNumber(value);
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function getApiUrl() {
  if (typeof window !== "undefined")
    return `${window.location.origin}/api/google-sheets`;
  const apiUrl =
    process.env.GOOGLE_APPS_SCRIPT_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl)
    throw new Error("GOOGLE_APPS_SCRIPT_API_URL no está configurada.");
  return apiUrl;
}

export function getMaintenanceHistoryApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "historial");
  return url.toString();
}

export function parseMaintenanceHistoryResponse(
  data: unknown,
): MaintenanceHistoryRecord[] {
  if (!Array.isArray(data))
    throw new Error("La API no devolvió una lista de historial.");

  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      idHistorial: readField(item, "idHistorial") as string,
      folioOT: readField(item, "folioOT") as string,
      fechaCierre: readField(item, "fechaCierre") as string,
      codigoActivo: readField(item, "codigoActivo") as string,
      activo: readField(item, "activo") as string,
      tipoMantenimiento: readField(item, "tipoMantenimiento") as string,
      fallaDetectada: readField(item, "fallaDetectada") as string,
      trabajoRealizado: readField(item, "trabajoRealizado") as string,
      tecnico: readField(item, "tecnico") as string,
      tiempoParoHoras: readField(item, "tiempoParoHoras") as number,
      costoRefacciones: readField(item, "costoRefacciones") as number,
      costoManoObra: readField(item, "costoManoObra") as number,
      costoTotal: readField(item, "costoTotal") as number,
      estadoFinal: readField(item, "estadoFinal") as string,
      observaciones: readField(item, "observaciones") as string,
    }))
    .filter((record) => record.idHistorial || record.folioOT);
}

export async function fetchMaintenanceHistory() {
  const response = await fetch(getMaintenanceHistoryApiUrl());
  if (!response.ok)
    throw new Error(`La API de historial respondió con ${response.status}.`);
  return parseMaintenanceHistoryResponse(await response.json());
}

export function filterMaintenanceHistory(
  records: MaintenanceHistoryRecord[],
  filters: MaintenanceHistoryFilters,
) {
  const query = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    const matchesSearch =
      !query ||
      [record.folioOT, record.codigoActivo, record.activo].some((value) =>
        value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (!filters.tipoMantenimiento ||
        record.tipoMantenimiento === filters.tipoMantenimiento) &&
      (!filters.tecnico || record.tecnico === filters.tecnico) &&
      (!filters.estadoFinal || record.estadoFinal === filters.estadoFinal)
    );
  });
}

export function getMaintenanceHistoryIndicators(
  records: MaintenanceHistoryRecord[],
) {
  return {
    totalServicios: records.length,
    correctivos: records.filter((record) =>
      record.tipoMantenimiento.toLowerCase().includes("correctivo"),
    ).length,
    preventivos: records.filter((record) =>
      record.tipoMantenimiento.toLowerCase().includes("preventivo"),
    ).length,
    horasParo: records.reduce((sum, record) => sum + record.tiempoParoHoras, 0),
    costoTotal: records.reduce((sum, record) => sum + record.costoTotal, 0),
  };
}
