export const USER_ROLES = [
  "Administrador",
  "Supervisor",
  "Técnico",
  "Consulta",
] as const;
export const USER_STATUSES = ["Activo", "Inactivo"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  idUsuario: string;
  nombre: string;
  correo: string;
  rol: string;
  sucursal: string;
  area: string;
  estado: string;
  fechaCreacion: string;
  fechaActualizacion: string;
};

export type UserFilters = { search: string; rol: string; estado: string };
export type CreateUserPayload = Omit<
  User,
  "idUsuario" | "fechaCreacion" | "fechaActualizacion"
> & {
  rol: UserRole;
  estado: UserStatus;
};

const FIELD_ALIASES: Record<keyof User, string[]> = {
  idUsuario: ["IdUsuario", "id usuario", "idusuario"],
  nombre: ["Nombre", "name"],
  correo: ["Correo", "email", "correo electronico", "correo electrónico"],
  rol: ["Rol", "role"],
  sucursal: ["Sucursal", "branch"],
  area: ["Area", "Área", "department"],
  estado: ["Estado", "status"],
  fechaCreacion: ["FechaCreacion", "fecha creacion", "fecha creación"],
  fechaActualizacion: [
    "FechaActualizacion",
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

function readUserField(record: Record<string, unknown>, field: keyof User) {
  const aliases = FIELD_ALIASES[field].map(normalizeKey);
  const sourceKey = Object.keys(record).find((key) =>
    aliases.includes(normalizeKey(key)),
  );
  const value = sourceKey ? record[sourceKey] : undefined;
  return typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
    ? String(value).trim()
    : "";
}

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");
  return apiUrl;
}

export function getUsersApiUrl() {
  const url = new URL(getApiUrl());
  url.searchParams.set("accion", "usuarios");
  return url.toString();
}

export function parseUsersResponse(data: unknown): User[] {
  if (!Array.isArray(data))
    throw new Error("La API no devolvió una lista de usuarios.");
  return data
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      idUsuario: readUserField(item, "idUsuario"),
      nombre: readUserField(item, "nombre"),
      correo: readUserField(item, "correo"),
      rol: readUserField(item, "rol"),
      sucursal: readUserField(item, "sucursal"),
      area: readUserField(item, "area"),
      estado: readUserField(item, "estado"),
      fechaCreacion: readUserField(item, "fechaCreacion"),
      fechaActualizacion: readUserField(item, "fechaActualizacion"),
    }))
    .filter((user) => user.idUsuario && user.correo);
}

export async function fetchUsers() {
  const response = await fetch(getUsersApiUrl());
  if (!response.ok)
    throw new Error(`La API de usuarios respondió con ${response.status}.`);
  return parseUsersResponse(await response.json());
}

async function postUserAction(payload: Record<string, unknown>) {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    throw new Error(`La API de usuarios respondió con ${response.status}.`);
  const data = await response.json();
  if (!data || typeof data !== "object" || !("ok" in data) || !data.ok) {
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : "No se pudo guardar el usuario.",
    );
  }
  return data;
}

export function createUser(payload: CreateUserPayload) {
  return postUserAction({ accion: "crearUsuario", ...payload });
}

export function filterUsers(users: User[], filters: UserFilters) {
  const query = filters.search.trim().toLowerCase();
  return users.filter((user) => {
    const matchesSearch =
      !query ||
      [user.idUsuario, user.nombre, user.correo, user.sucursal, user.area].some(
        (value) => value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (!filters.rol || user.rol === filters.rol) &&
      (!filters.estado || user.estado === filters.estado)
    );
  });
}
