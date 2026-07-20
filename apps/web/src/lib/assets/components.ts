export type AssetComponent = {
  idComponente: string;
  codigoActivo: string;
  codigoComponente: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  ubicacion: string;
  estado: string;
  fechaInstalacion: string;
};

export type ComponentInput = Omit<AssetComponent, "idComponente" | "codigoComponente">;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, "");
}

function read(row: Record<string, unknown>, ...aliases: string[]) {
  const keys = Object.keys(row);
  const key = keys.find((candidate) => aliases.map(normalize).includes(normalize(candidate)));
  return key ? String(row[key] ?? "").trim() : "";
}

export function parseComponents(data: unknown): AssetComponent[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object").map((row) => ({
    idComponente: read(row, "IdComponente", "id"),
    codigoActivo: read(row, "CodigoActivo", "Código Activo", "ActivoPadre"),
    codigoComponente: read(row, "CodigoComponente", "Código Componente", "codigo"),
    nombre: read(row, "Nombre", "Componente"),
    tipo: read(row, "Tipo"),
    marca: read(row, "Marca"),
    modelo: read(row, "Modelo"),
    numeroSerie: read(row, "NumeroSerie", "Número de Serie", "Serie"),
    ubicacion: read(row, "Ubicacion", "Ubicación"),
    estado: read(row, "Estado"),
    fechaInstalacion: read(row, "FechaInstalacion", "Fecha Instalación"),
  }));
}

export async function fetchComponents() {
  const url = new URL("/api/google-sheets", window.location.origin);
  url.searchParams.set("accion", "componentesActivos");
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudieron cargar los componentes.");
  return parseComponents(await response.json());
}

export function validateComponent(input: ComponentInput) {
  if (!input.codigoActivo.trim()) return "Selecciona el equipo principal.";
  if (!input.nombre.trim()) return "Captura el nombre del componente.";
  if (!input.tipo.trim()) return "Captura el tipo de componente.";
  if (!input.ubicacion.trim()) return "Captura dónde está dentro del equipo.";
  if (!input.estado.trim()) return "Selecciona el estado.";
  return null;
}

export async function createComponent(input: ComponentInput) {
  const response = await fetch("/api/google-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "crearComponenteActivo", ...input }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo crear el componente.");
  return data as { ok: true; codigoComponente: string };
}
