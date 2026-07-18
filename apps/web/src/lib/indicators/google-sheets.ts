export type IndicatorRecord = {
  periodo: string;
  sucursal: string;
  disponibilidadPct: number;
  mtbfHoras: number;
  mttrHoras: number;
  cumplimientoPreventivoPct: number;
  ordenesCorrectivas: number;
  ordenesPreventivas: number;
  horasParo: number;
  costoMantenimiento: number;
  fechaActualizacion: string;
};

export type IndicatorFilters = {
  sucursal: string;
  periodoDesde: string;
  periodoHasta: string;
};

export type IndicatorVariation = {
  current: IndicatorRecord | null;
  previous: IndicatorRecord | null;
  changes: Record<
    | "disponibilidadPct"
    | "mtbfHoras"
    | "mttrHoras"
    | "cumplimientoPreventivoPct"
    | "horasParo"
    | "costoMantenimiento",
    number | null
  >;
};

const FIELD_ALIASES: Record<keyof IndicatorRecord, string[]> = {
  periodo: ["Periodo"],
  sucursal: ["Sucursal"],
  disponibilidadPct: ["DisponibilidadPct"],
  mtbfHoras: ["MTBFHoras"],
  mttrHoras: ["MTTRHoras"],
  cumplimientoPreventivoPct: ["CumplimientoPreventivoPct"],
  ordenesCorrectivas: ["OrdenesCorrectivas", "ÓrdenesCorrectivas"],
  ordenesPreventivas: ["OrdenesPreventivas", "ÓrdenesPreventivas"],
  horasParo: ["HorasParo"],
  costoMantenimiento: ["CostoMantenimiento"],
  fechaActualizacion: ["FechaActualizacion"],
};

const NUMERIC_FIELDS = new Set<keyof IndicatorRecord>([
  "disponibilidadPct",
  "mtbfHoras",
  "mttrHoras",
  "cumplimientoPreventivoPct",
  "ordenesCorrectivas",
  "ordenesPreventivas",
  "horasParo",
  "costoMantenimiento",
]);

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseIndicatorNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeIndicatorPeriod(value: unknown) {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const rawValue = String(value ?? "").trim();
  const yearMonthMatch = rawValue.match(/^(\d{4})-(\d{2})(?:$|[-T\s])/);
  if (yearMonthMatch) return `${yearMonthMatch[1]}-${yearMonthMatch[2]}`;

  return rawValue;
}

export function formatIndicatorPeriod(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;

  const [, year, month] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const formattedMonth = new Intl.DateTimeFormat("es-MX", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");

  return `${formattedMonth.charAt(0).toUpperCase()}${formattedMonth.slice(1)} ${year}`;
}

export function formatIndicatorDate(value: string) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  }

  return rawValue;
}

function readField(
  record: Record<string, unknown>,
  field: keyof IndicatorRecord,
) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;

  if (NUMERIC_FIELDS.has(field)) return parseIndicatorNumber(value);
  if (field === "periodo") return normalizeIndicatorPeriod(value);
  if (field === "fechaActualizacion") {
    const rawValue = value instanceof Date ? value.toISOString() : value;
    return formatIndicatorDate(String(rawValue ?? ""));
  }
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

export function getIndicatorsApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "indicadores");
  return url.toString();
}

export function sortIndicatorsByPeriod(records: IndicatorRecord[]) {
  return [...records].sort((a, b) =>
    a.periodo.localeCompare(b.periodo, "es-MX", { numeric: true }),
  );
}

export function parseIndicatorsResponse(data: unknown): IndicatorRecord[] {
  if (!Array.isArray(data)) {
    throw new Error("La API no devolvió una lista de indicadores.");
  }

  return sortIndicatorsByPeriod(
    data
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        periodo: readField(item, "periodo") as string,
        sucursal: readField(item, "sucursal") as string,
        disponibilidadPct: readField(item, "disponibilidadPct") as number,
        mtbfHoras: readField(item, "mtbfHoras") as number,
        mttrHoras: readField(item, "mttrHoras") as number,
        cumplimientoPreventivoPct: readField(
          item,
          "cumplimientoPreventivoPct",
        ) as number,
        ordenesCorrectivas: readField(item, "ordenesCorrectivas") as number,
        ordenesPreventivas: readField(item, "ordenesPreventivas") as number,
        horasParo: readField(item, "horasParo") as number,
        costoMantenimiento: readField(item, "costoMantenimiento") as number,
        fechaActualizacion: readField(item, "fechaActualizacion") as string,
      }))
      .filter((record) => record.periodo),
  );
}

export async function fetchIndicators() {
  const response = await fetch(getIndicatorsApiUrl());
  if (!response.ok)
    throw new Error(`La API de indicadores respondió con ${response.status}.`);
  return parseIndicatorsResponse(await response.json());
}

export function filterIndicators(
  records: IndicatorRecord[],
  filters: IndicatorFilters,
) {
  return sortIndicatorsByPeriod(
    records.filter(
      (record) =>
        (!filters.sucursal || record.sucursal === filters.sucursal) &&
        (!filters.periodoDesde || record.periodo >= filters.periodoDesde) &&
        (!filters.periodoHasta || record.periodo <= filters.periodoHasta),
    ),
  );
}

export function getLatestPeriodVariation(
  records: IndicatorRecord[],
): IndicatorVariation {
  const sorted = sortIndicatorsByPeriod(records);
  const current = sorted.at(-1) ?? null;
  const previous = sorted.at(-2) ?? null;
  const fields = [
    "disponibilidadPct",
    "mtbfHoras",
    "mttrHoras",
    "cumplimientoPreventivoPct",
    "horasParo",
    "costoMantenimiento",
  ] as const;

  return {
    current,
    previous,
    changes: Object.fromEntries(
      fields.map((field) => [
        field,
        current && previous ? current[field] - previous[field] : null,
      ]),
    ) as IndicatorVariation["changes"],
  };
}

export function getPeriodRange(records: IndicatorRecord[]) {
  return sortIndicatorsByPeriod(records).map((record) => record.periodo);
}
