export type Asset = {
  codigo: string;
  nombre: string;
  tipo: string;
  sucursal: string;
  area: string;
  ubicacion: string;
  marca: string;
  estado: string;
  criticidad: string;
};

export type AssetMutationInput = Asset & {
  motivo: string;
  responsable: string;
};

export type AssetMovement = {
  idMovimiento: string;
  codigoActivo: string;
  fecha: string;
  sucursalAnterior: string;
  sucursalNueva: string;
  areaAnterior: string;
  areaNueva: string;
  ubicacionAnterior: string;
  ubicacionNueva: string;
  estadoAnterior: string;
  estadoNuevo: string;
  motivo: string;
  responsable: string;
};

const FIELD_ALIASES: Record<keyof Asset, string[]> = {
  codigo: ["codigo", "código", "cod", "code", "id"],
  nombre: ["nombre", "name", "activo", "equipo"],
  sucursal: ["sucursal", "branch", "planta"],
  ubicacion: ["ubicacion", "ubicación", "location"],
  tipo: ["tipo", "type", "categoria", "categoría"],
  area: ["area", "área", "departamento", "sector"],
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
  const sourceKeys = Object.keys(record).filter((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const sourceKey = sourceKeys.find((key) => {
    const candidate = record[key];
    return candidate !== null && candidate !== undefined && String(candidate).trim() !== "";
  }) ?? sourceKeys[0];
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
      sucursal: readAssetField(asset, "sucursal"),
      area: readAssetField(asset, "area"),
      ubicacion: readAssetField(asset, "ubicacion"),
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

export function validateAsset(input: AssetMutationInput, requireCode = true) {
  const errors: Partial<Record<keyof AssetMutationInput, string>> = {};
  if (requireCode && !input.codigo.trim()) errors.codigo = "Falta el código del activo.";
  if (!input.nombre.trim()) errors.nombre = "Captura el nombre.";
  if (!input.tipo.trim()) errors.tipo = "Captura el tipo.";
  if (!input.sucursal.trim()) errors.sucursal = "Captura la sucursal.";
  if (!input.area.trim()) errors.area = "Captura el área.";
  if (!input.ubicacion.trim()) errors.ubicacion = "Captura la ubicación.";
  if (!input.estado.trim()) errors.estado = "Selecciona el estado.";
  if (!input.criticidad.trim()) errors.criticidad = "Selecciona la criticidad.";
  if (!input.motivo.trim()) errors.motivo = "Captura el motivo del cambio.";
  if (!input.responsable.trim()) errors.responsable = "Falta el responsable.";
  return errors;
}

async function postAssetAction(payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch("/api/google-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("Google Sheets tardó demasiado en responder. Intenta nuevamente.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || !data.ok)
    throw new Error(data.error || "No se pudo guardar el activo.");
  return data;
}

export function createAsset(input: AssetMutationInput) {
  return postAssetAction({ accion: "crearActivo", ...input });
}

export function updateAsset(input: AssetMutationInput) {
  return postAssetAction({ accion: "actualizarActivo", ...input });
}

export async function fetchAssetMovements(codigoActivo: string) {
  const url = new URL("/api/google-sheets", window.location.origin);
  url.searchParams.set("accion", "movimientosActivos");
  url.searchParams.set("codigoActivo", codigoActivo);
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar el historial.");
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  const field = (row: Record<string, unknown>, key: string) => {
    const sourceKey = Object.keys(row).find((candidate) =>
      normalizeKey(candidate) === normalizeKey(key),
    );
    return sourceKey ? String(row[sourceKey] ?? "") : "";
  };
  return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object").map((row) => ({
    idMovimiento: field(row, "IdMovimiento"),
    codigoActivo: field(row, "CodigoActivo"),
    fecha: field(row, "Fecha"),
    sucursalAnterior: field(row, "SucursalAnterior"),
    sucursalNueva: field(row, "SucursalNueva"),
    areaAnterior: field(row, "AreaAnterior"),
    areaNueva: field(row, "AreaNueva"),
    ubicacionAnterior: field(row, "UbicacionAnterior"),
    ubicacionNueva: field(row, "UbicacionNueva"),
    estadoAnterior: field(row, "EstadoAnterior"),
    estadoNuevo: field(row, "EstadoNuevo"),
    motivo: field(row, "Motivo"),
    responsable: field(row, "Responsable"),
  }));
}
