import { normalizeRole, type Role } from "./roles";

export const SESSION_COOKIE = "gla_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  sucursal: string;
  area: string;
};
export type SessionPayload = { user: SessionUser; exp: number };

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  path: "/";
};

type RawSessionPayload = Omit<SessionPayload, "user"> & {
  user: Omit<SessionUser, "role"> & { role: string };
};

export function shouldUseSecureSessionCookie(requestUrl: string) {
  const url = new URL(requestUrl);
  return url.protocol === "https:" && url.hostname !== "localhost";
}

export function getSessionCookieOptions(
  requestUrl: string,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(requestUrl),
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

function base64url(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromBase64url(input: string) {
  const base64 = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
async function sign(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)),
  );
}
function timingSafeEqual(a: string, b: string) {
  return (
    a.length === b.length &&
    [...a].reduce((ok, ch, i) => ok && ch === b[i], true)
  );
}
export async function createSessionToken(
  payload: SessionPayload,
  secret: string,
) {
  const role = normalizeRole(payload.user.role);
  if (!role) throw new Error("SESSION_ROLE_INVALID");
  const normalizedPayload: SessionPayload = {
    ...payload,
    user: {
      ...payload.user,
      email: payload.user.email.trim().toLowerCase(),
      role,
    },
  };
  const body = base64url(JSON.stringify(normalizedPayload));
  return `${body}.${await sign(body, secret)}`;
}
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (
    extra ||
    !body ||
    !signature ||
    !timingSafeEqual(signature, await sign(body, secret))
  )
    return null;
  try {
    const payload = JSON.parse(fromBase64url(body)) as RawSessionPayload;
    const role = normalizeRole(payload.user?.role ?? "");
    if (payload.exp <= Date.now() || !role) return null;
    return { ...payload, user: { ...payload.user, role } };
  } catch {
    return null;
  }
}
