import { fetchUsers, type User } from "@/lib/users/google-sheets";
import {
  normalizeEmail,
  normalizeRole,
  normalizeStatus,
  type Role,
} from "./permissions";

export type AuthorizedCfgUser = User & { rol: Role; estado: "Activo" };

export async function findActiveCfgUser(
  email: string,
): Promise<AuthorizedCfgUser | null> {
  const normalized = normalizeEmail(email);
  const user = (await fetchUsers()).find(
    (item) => normalizeEmail(item.correo) === normalized,
  );
  const role = user ? normalizeRole(user.rol) : null;
  const status = user ? normalizeStatus(user.estado) : null;
  if (!user || status !== "Activo" || !role) return null;
  return { ...user, rol: role, estado: "Activo" };
}
