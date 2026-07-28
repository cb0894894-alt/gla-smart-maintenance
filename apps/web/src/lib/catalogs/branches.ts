export type Branch = { idSucursal: string; codigo: string; nombre: string; direccion: string; ciudad: string; estadoRegion: string; responsable: string; telefono: string; estado: string };
export type Area = { idArea: string; idSucursal: string; nombre: string; estado: string };
export type BranchCatalogs = {
  branches: Branch[];
  areas: Area[];
  failed: ("sucursales" | "areas")[];
};

async function request(action: string, init?: RequestInit) {
  const url = new URL("/api/google-sheets", window.location.origin); url.searchParams.set("accion", action);
  const response = await fetch(init ? "/api/google-sheets" : url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (!Array.isArray(data) && !data.ok)) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
function text(record: Record<string, unknown>, ...keys: string[]) {
  const key = keys.find((candidate) => typeof record[candidate] !== "undefined");
  return key ? String(record[key] ?? "") : "";
}

export async function fetchBranches(): Promise<Branch[]> {
  const rows = await request("sucursales") as Record<string, unknown>[];
  return rows.map((row) => ({
    idSucursal: text(row, "idSucursal", "IdSucursal"),
    codigo: text(row, "codigo", "Codigo", "Código"),
    nombre: text(row, "nombre", "Nombre"),
    direccion: text(row, "direccion", "Direccion", "Dirección"),
    ciudad: text(row, "ciudad", "Ciudad"),
    estadoRegion: text(row, "estadoRegion", "EstadoRegion", "Estado/Provincia"),
    responsable: text(row, "responsable", "Responsable"),
    telefono: text(row, "telefono", "Telefono", "Teléfono"),
    estado: text(row, "estado", "Estado"),
  })).filter((branch) => branch.idSucursal || branch.codigo || branch.nombre);
}

export async function fetchAreas(): Promise<Area[]> {
  const rows = await request("areas") as Record<string, unknown>[];
  const mapped = rows.map((row) => ({
    idArea: text(row, "idArea", "IdArea"),
    idSucursal: text(row, "idSucursal", "IdSucursal"),
    nombre: text(row, "nombre", "Nombre"),
    estado: text(row, "estado", "Estado"),
  })).filter((area) => area.idArea || area.nombre);
  const seen = new Set<string>();
  return mapped.filter((area) => {
    const key = `${area.idSucursal.trim().toLocaleLowerCase()}::${area.nombre.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function retry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempts <= 1) throw error;
    return retry(operation, attempts - 1);
  }
}

export async function fetchBranchCatalogs(): Promise<BranchCatalogs> {
  const [branchesResult, areasResult] = await Promise.allSettled([
    retry(fetchBranches),
    retry(fetchAreas),
  ]);
  const failed: BranchCatalogs["failed"] = [];
  if (branchesResult.status === "rejected") failed.push("sucursales");
  if (areasResult.status === "rejected") failed.push("areas");

  return {
    branches:
      branchesResult.status === "fulfilled" ? branchesResult.value : [],
    areas: areasResult.status === "fulfilled" ? areasResult.value : [],
    failed,
  };
}

export async function saveBranch(input: Partial<Branch>) { return request("guardarSucursal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "guardarSucursal", ...input }) }); }
export async function saveArea(input: Partial<Area>) { return request("guardarArea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "guardarArea", ...input }) }); }
export async function changeBranchStatus(idSucursal: string, estado: "Activo" | "Inactivo") { return request("cambiarEstadoSucursal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "cambiarEstadoSucursal", idSucursal, estado }) }); }
export async function changeAreaStatus(idArea: string, estado: "Activo" | "Inactivo") { return request("cambiarEstadoArea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "cambiarEstadoArea", idArea, estado }) }); }
