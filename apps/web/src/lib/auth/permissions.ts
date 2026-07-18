import { normalizeRole, type Role } from "./roles";
export {
  ROLES,
  isRole,
  normalizeEmail,
  normalizeRole,
  normalizeStatus,
  type Role,
} from "./roles";

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
  ],
  Técnico: [
    "activos:read",
    "fallas:create",
    "ordenes:read",
    "ordenes:write",
    "preventivos:read",
    "preventivos:write",
    "historial:read",
  ],
  Consulta: [
    "activos:read",
    "ordenes:read",
    "preventivos:read",
    "inventario:read",
    "historial:read",
  ],
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

export function getPermissions(role: string): Permission[] {
  const normalized = normalizeRole(role);
  return normalized ? ROLE_PERMISSIONS[normalized] : [];
}
export function can(role: string, permission: Permission) {
  return getPermissions(role).includes(permission);
}
export function canAccessPath(role: string, pathname: string) {
  const entry = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(
      ([path]) =>
        pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
    );
  return entry ? can(role, entry[1]) : true;
}
export function isReadOnlyRole(role: string) {
  return normalizeRole(role) === "Consulta";
}
