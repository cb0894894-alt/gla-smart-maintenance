export type Asset = {
  codigo: string;
  nombre: string;
  tipo: string;
  area: string;
  marca: string;
  estado: string;
  criticidad: string;
};

const FIELD_ALIASES: Record<keyof Asset, string[]> = {
  codigo: ["codigo", "código", "cod", "code", "id"],
  nombre: ["nombre", "name", "activo", "equipo"],
  tipo: ["tipo", "type", "categoria", "categoría"],
  area: ["area", "área", "ubicacion", "ubicación", "sector"],
  marca: ["marca", "brand", "fabricante"],
  estado: ["estado", "status"],
  criticidad: ["criticidad", "criticality", "crit"],
};

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readAssetField(record: Record<string, unknown>, field: keyof Asset) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;

  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function getApiUrl() {
  if (typeof window !== "undefined")
    return `${window.location.origin}/api/google-sheets`;
  const apiUrl =
    process.env.GOOGLE_APPS_SCRIPT_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  return apiUrl;
}

export function getAssetsApiUrl() {
  const apiUrl = getApiUrl();

  if (!apiUrl) {
    console.error("GOOGLE_APPS_SCRIPT_API_URL is not configured.");
    return null;
  }

  const url = new URL(apiUrl);
  url.searchParams.set("accion", "activos");

  return url.toString();
}

export function parseAssetsResponse(data: unknown): Asset[] {
  if (!Array.isArray(data)) {
    console.error("Unexpected assets response format.", data);
    return [];
  }

  return data
    .filter(
      (asset): asset is Record<string, unknown> =>
        typeof asset === "object" && asset !== null,
    )
    .map((asset) => ({
      codigo: readAssetField(asset, "codigo"),
      nombre: readAssetField(asset, "nombre"),
      tipo: readAssetField(asset, "tipo"),
      area: readAssetField(asset, "area"),
      marca: readAssetField(asset, "marca"),
      estado: readAssetField(asset, "estado"),
      criticidad: readAssetField(asset, "criticidad"),
    }));
}

export async function fetchAssets() {
  const assetsApiUrl = getAssetsApiUrl();

  if (!assetsApiUrl) {
    throw new Error("GOOGLE_APPS_SCRIPT_API_URL no está configurada.");
  }

  const response = await fetch(assetsApiUrl);

  if (!response.ok) {
    throw new Error(`Assets API responded with ${response.status}`);
  }

  return parseAssetsResponse(await response.json());
}
