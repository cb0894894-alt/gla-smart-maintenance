export const ROLES = [
  "Administrador",
  "Supervisor",
  "Técnico",
  "Consulta",
] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["Activo", "Inactivo"] as const;
export type UserStatus = (typeof STATUSES)[number];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeRole(value: string): Role | null {
  const normalized = normalizeText(value);
  return ROLES.find((role) => normalizeText(role) === normalized) ?? null;
}

export function normalizeStatus(value: string): UserStatus | null {
  const normalized = normalizeText(value);
  return (
    STATUSES.find((status) => normalizeText(status) === normalized) ?? null
  );
}

export function isActiveStatus(value: string) {
  return normalizeStatus(value) === "Activo";
}

export function isRole(value: string): value is Role {
  return normalizeRole(value) !== null;
}
