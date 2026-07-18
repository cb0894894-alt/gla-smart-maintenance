export const ROLES = ["Administrador", "Supervisor", "Técnico", "Consulta"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "activos:read",
  "activos:write",
  "fallas:create",
  "ordenes:read",
  "ordenes:write",
  "preventivos:read",
  "preventivos:write",
  "inventario:read",
  "inventario:write",
  "historial:read",
  "indicadores:read",
  "usuarios:read",
  "usuarios:write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Administrador: [...PERMISSIONS],
  Supervisor: [
    "activos:read", "activos:write", "fallas:create", "ordenes:read", "ordenes:write",
    "preventivos:read", "preventivos:write", "inventario:read", "inventario:write",
    "historial:read", "indicadores:read",
  ],
  Técnico: [
    "activos:read", "fallas:create", "ordenes:read", "ordenes:write",
    "preventivos:read", "preventivos:write", "historial:read",
  ],
  Consulta: ["activos:read", "ordenes:read", "preventivos:read", "inventario:read", "historial:read"],
};

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/": "indicadores:read",
  "/activos": "activos:read",
  "/reportar-falla": "fallas:create",
  "/ordenes-trabajo": "ordenes:read",
  "/mantenimiento-preventivo": "preventivos:read",
  "/inventario": "inventario:read",
  "/usuarios": "usuarios:read",
  "/historial": "historial:read",
  "/indicadores": "indicadores:read",
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function normalizeRole(value: string): Role | null {
  const normalized = normalizeText(value);
  return ROLES.find((role) => normalizeText(role) === normalized) ?? null;
}
export function normalizeStatus(value: string) { return normalizeText(value) === "activo" ? "Activo" : value.trim(); }
export function isRole(value: string): value is Role { return normalizeRole(value) !== null; }
export function getPermissions(role: string): Permission[] { const normalized = normalizeRole(role); return normalized ? ROLE_PERMISSIONS[normalized] : []; }
export function can(role: string, permission: Permission) { return getPermissions(role).includes(permission); }
export function canAccessPath(role: string, pathname: string) {
  const entry = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
  return entry ? can(role, entry[1]) : true;
}
export function isReadOnlyRole(role: string) { return normalizeRole(role) === "Consulta"; }
