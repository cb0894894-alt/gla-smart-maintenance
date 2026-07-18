import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { findActiveCfgUser } from "./cfg-users";
import { SESSION_COOKIE, verifySessionToken } from "./token";
import type { Role } from "./roles";

export function logAuthFailure(scope: string, reason: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth:${scope}] ${reason}`);
  }
}

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurada.");
  return secret;
}

export async function getServerSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    logAuthFailure("session", "missing_session_cookie");
    return null;
  }

  const session = await verifySessionToken(token, getAuthSecret());
  if (!session) {
    logAuthFailure("session", "invalid_or_expired_session_token");
    return null;
  }

  const cfgUser = await findActiveCfgUser(session.user.email).catch((error) => {
    logAuthFailure(
      "session",
      error instanceof Error
        ? "cfg_user_lookup_failed"
        : "cfg_user_lookup_unknown_failure",
    );
    return null;
  });
  if (!cfgUser) {
    logAuthFailure("session", "cfg_user_not_active_or_not_found");
    return null;
  }

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

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    redirect("/acceso-denegado");
  }

  return session;
}

export async function requireRole(allowedRoles: readonly Role[]) {
  const session = await requireSession();
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/acceso-denegado");
  }

  return session;
}
