export type InventoryItem = {
  codigo: string;
  refaccion: string;
  categoria: string;
  existencia: number;
  stockMinimo: number;
  unidad: string;
  ubicacion: string;
  proveedor: string;
  costoUnitario: number;
  estado: string;
  ultimaActualizacion: string;
};

export type InventoryFilters = {
  search: string;
  categoria: string;
  estado: string;
};

const FIELD_ALIASES: Record<keyof InventoryItem, string[]> = {
  codigo: ["codigo", "código", "cod", "code", "id"],
  refaccion: ["refaccion", "refacción", "part", "pieza", "nombre"],
  categoria: ["categoria", "categoría", "tipo"],
  existencia: ["existencia", "stock", "cantidad"],
  stockMinimo: ["stock minimo", "stock mínimo", "stockminimo", "stock_minimo"],
  unidad: ["unidad", "uom"],
  ubicacion: ["ubicacion", "ubicación", "location"],
  proveedor: ["proveedor", "supplier"],
  costoUnitario: ["costo unitario", "costo", "precio unitario"],
  estado: ["estado", "status"],
  ultimaActualizacion: [
    "ultima actualizacion",
    "última actualización",
    "ultimaactualizacion",
    "fecha actualizacion",
  ],
};

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readInventoryField(
  record: Record<string, unknown>,
  field:
    | "codigo"
    | "refaccion"
    | "categoria"
    | "unidad"
    | "ubicacion"
    | "proveedor"
    | "estado"
    | "ultimaActualizacion",
): string;
function readInventoryField(
  record: Record<string, unknown>,
  field: "existencia" | "stockMinimo" | "costoUnitario",
): number;
function readInventoryField(
  record: Record<string, unknown>,
  field: keyof InventoryItem,
) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;

  if (
    field === "existencia" ||
    field === "stockMinimo" ||
    field === "costoUnitario"
  ) {
    const numericValue =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

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

export function getInventoryApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "inventario");
  return url.toString();
}

export function parseInventoryResponse(data: unknown): InventoryItem[] {
  if (!Array.isArray(data)) {
    throw new Error("La API no devolvió una lista de refacciones.");
  }

  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      codigo: readInventoryField(item, "codigo"),
      refaccion: readInventoryField(item, "refaccion"),
      categoria: readInventoryField(item, "categoria"),
      existencia: readInventoryField(item, "existencia"),
      stockMinimo: readInventoryField(item, "stockMinimo"),
      unidad: readInventoryField(item, "unidad"),
      ubicacion: readInventoryField(item, "ubicacion"),
      proveedor: readInventoryField(item, "proveedor"),
      costoUnitario: readInventoryField(item, "costoUnitario"),
      estado: readInventoryField(item, "estado"),
      ultimaActualizacion: readInventoryField(item, "ultimaActualizacion"),
    }))
    .filter((item) => item.codigo);
}

export async function fetchInventory() {
  const response = await fetch(getInventoryApiUrl());
  if (!response.ok)
    throw new Error(`La API de inventario respondió con ${response.status}.`);
  return parseInventoryResponse(await response.json());
}

export function filterInventoryItems(
  items: InventoryItem[],
  filters: InventoryFilters,
) {
  const query = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !query ||
      [item.codigo, item.refaccion, item.proveedor, item.ubicacion].some(
        (value) => value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (!filters.categoria || item.categoria === filters.categoria) &&
      (!filters.estado || item.estado === filters.estado)
    );
  });
}

export function getInventoryIndicators(items: InventoryItem[]) {
  return {
    total: items.length,
    bajas: items.filter(
      (item) => item.existencia <= item.stockMinimo && item.existencia > 0,
    ).length,
    agotadas: items.filter((item) => item.existencia === 0).length,
    valorInventario: items.reduce(
      (sum, item) => sum + item.existencia * item.costoUnitario,
      0,
    ),
  };
}
