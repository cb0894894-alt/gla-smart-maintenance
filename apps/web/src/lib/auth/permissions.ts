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
    "historial:read",
  ],
};

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/": ["Administrador", "Supervisor"],
  "/usuarios": ["Administrador"],
  "/indicadores": ["Administrador", "Supervisor"],
  "/inventario": ["Administrador", "Supervisor"],
  "/activos": ["Administrador", "Supervisor", "Técnico", "Consulta"],
  "/reportar-falla": ["Administrador", "Supervisor", "Técnico"],
  "/ordenes-trabajo": ["Administrador", "Supervisor", "Técnico"],
  "/mantenimiento-preventivo": ["Administrador", "Supervisor", "Técnico"],
  "/historial": ["Administrador", "Supervisor", "Técnico", "Consulta"],
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

export const API_ACTION_PERMISSIONS: Record<string, Permission> = {
  activos: "activos:read",
  usuarios: "usuarios:read",
  crearUsuario: "usuarios:write",
  indicadores: "indicadores:read",
  inventario: "inventario:read",
  historial: "historial:read",
  ordenesTrabajo: "ordenes:read",
  reportarFalla: "fallas:create",
  crearOrdenTrabajo: "fallas:create",
  actualizarEstadoOrdenTrabajo: "ordenes:write",
  cerrarOrdenTrabajo: "ordenes:write",
  mantenimientoPreventivo: "preventivos:read",
  preventivos: "preventivos:read",
  crearPreventivo: "preventivos:write",
  registrarEjecucionPreventivo: "preventivos:write",
};

export const DEFAULT_ROLE_PATHS: Record<Role, string> = {
  Administrador: "/",
  Supervisor: "/",
  Técnico: "/activos",
  Consulta: "/activos",
};

export function getPermissions(role: string): Permission[] {
  const normalized = normalizeRole(role);
  return normalized ? ROLE_PERMISSIONS[normalized] : [];
}
export function can(role: string, permission: Permission) {
  return getPermissions(role).includes(permission);
}
function findRouteAccess(pathname: string) {
  return Object.entries(ROUTE_ACCESS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(
      ([path]) =>
        pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
    );
}
export function canAccessPath(role: string, pathname: string) {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  const entry = findRouteAccess(pathname);
  return entry ? entry[1].includes(normalized) : true;
}
export function canPerformApiAction(role: string, action: string) {
  const permission = API_ACTION_PERMISSIONS[action];
  return permission ? can(role, permission) : false;
}
export function getDefaultPathForRole(role: string) {
  const normalized = normalizeRole(role);
  return normalized ? DEFAULT_ROLE_PATHS[normalized] : "/acceso-denegado";
}
export function isReadOnlyRole(role: string) {
  return normalizeRole(role) === "Consulta";
}
