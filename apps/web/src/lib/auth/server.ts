import { cookies } from "next/headers";
import { findActiveCfgUser } from "./cfg-users";
import { SESSION_COOKIE, verifySessionToken } from "./token";

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurada.");
  return secret;
}

export async function getServerSession() {
  const store = await cookies();
  const session = await verifySessionToken(
    store.get(SESSION_COOKIE)?.value,
    getAuthSecret(),
  );
  if (!session) return null;

  const cfgUser = await findActiveCfgUser(session.user.email);
  if (!cfgUser) return null;

  return {
    ...session,
    user: {
      ...session.user,
      name: cfgUser.nombre || session.user.name,
      email: cfgUser.correo,
      role: cfgUser.rol,
      sucursal: cfgUser.sucursal,
      area: cfgUser.area,
    },
  };
}
