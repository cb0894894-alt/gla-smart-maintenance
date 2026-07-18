import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./token";

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurada.");
  return secret;
}
export async function getServerSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, getAuthSecret());
}
