import { fetchUsers, type User } from "@/lib/users/google-sheets";
import { isRole, normalizeEmail, type Role } from "./permissions";

export type AuthorizedCfgUser = User & { rol: Role; estado: "Activo" };

export async function findActiveCfgUser(email: string): Promise<AuthorizedCfgUser | null> {
  const normalized = normalizeEmail(email);
  const user = (await fetchUsers()).find((item) => normalizeEmail(item.correo) === normalized);
  if (!user || user.estado !== "Activo" || !isRole(user.rol)) return null;
  return { ...user, rol: user.rol, estado: "Activo" };
}
