export type Asset = {
  codigo: string;
  nombre: string;
  tipo: string;
  area: string;
  marca: string;
  estado: string;
  criticidad: string;
};

type AssetRecord = Record<string, unknown>;

const FIELD_ALIASES = {
  codigo: ["codigo", "código", "cod", "id", "activo", "codigo_activo"],
  nombre: ["nombre", "name", "activo_nombre", "descripcion", "descripción"],
  tipo: ["tipo", "type", "categoria", "categoría"],
  area: ["area", "área", "ubicacion", "ubicación", "sector"],
  marca: ["marca", "brand", "fabricante"],
  estado: ["estado", "status", "condicion", "condición"],
  criticidad: ["criticidad", "criticality", "critico", "crítico", "prioridad"],
} as const;

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function readAssetField(record: AssetRecord, aliases: readonly string[]) {
  const normalizedEntries = Object.entries(record).map(
    ([key, value]) => [normalizeKey(key), value] as const,
  );
  const normalizedAliases = aliases.map(normalizeKey);
  const match = normalizedEntries.find(([key]) =>
    normalizedAliases.includes(key),
  );

  if (match?.[1] === undefined || match[1] === null) {
    return "";
  }

  return String(match[1]).trim();
}

export function getAssetsApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return null;
  }

  const url = new URL(apiUrl);
  url.searchParams.set("accion", "activos");

  return url.toString();
}

export function parseAssetsResponse(data: unknown): Asset[] {
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de activos debe ser un arreglo JSON.");
  }

  return data
    .filter((asset): asset is AssetRecord => {
      return typeof asset === "object" && asset !== null;
    })
    .map((asset) => ({
      codigo: readAssetField(asset, FIELD_ALIASES.codigo),
      nombre: readAssetField(asset, FIELD_ALIASES.nombre),
      tipo: readAssetField(asset, FIELD_ALIASES.tipo),
      area: readAssetField(asset, FIELD_ALIASES.area),
      marca: readAssetField(asset, FIELD_ALIASES.marca),
      estado: readAssetField(asset, FIELD_ALIASES.estado),
      criticidad: readAssetField(asset, FIELD_ALIASES.criticidad),
    }));
}

export async function fetchAssets() {
  const assetsApiUrl = getAssetsApiUrl();

  if (!assetsApiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada.");
  }

  const response = await fetch(assetsApiUrl);

  if (!response.ok) {
    throw new Error(
      `La API de activos respondió con estado ${response.status}.`,
    );
  }

  return parseAssetsResponse(await response.json());
}
