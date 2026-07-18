import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { findActiveCfgUser } from "@/lib/auth/cfg-users";
import { normalizeEmail } from "@/lib/auth/permissions";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/token";
import { getAuthSecret } from "@/lib/auth/server";

type GoogleTokenResponse = { id_token?: string; error?: string };
type GoogleIdTokenPayload = { email?: string; email_verified?: boolean; name?: string; nonce?: string };
function decodeJwtPayload(token: string): GoogleIdTokenPayload {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Google no devolvió un id_token válido.");
  return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64url").toString("utf8"));
}
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("gla_oauth_state")?.value;
  const expectedNonce = store.get("gla_oauth_nonce")?.value;
  store.delete("gla_oauth_state"); store.delete("gla_oauth_nonce");
  if (!code || !state || state !== expectedState) return NextResponse.redirect(new URL("/login?error=oauth_state", request.url));
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET, redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return NextResponse.redirect(new URL("/login?error=config", request.url));
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenData.id_token) return NextResponse.redirect(new URL("/login?error=google_token", request.url));
  const profile = decodeJwtPayload(tokenData.id_token);
  if (!profile.email || !profile.email_verified || profile.nonce !== expectedNonce) return NextResponse.redirect(new URL("/login?error=google_profile", request.url));
  const cfgUser = await findActiveCfgUser(profile.email);
  if (!cfgUser) return NextResponse.redirect(new URL("/acceso-denegado", request.url));
  const session = await createSessionToken({
    user: { name: cfgUser.nombre || profile.name || normalizeEmail(profile.email), email: normalizeEmail(profile.email), role: cfgUser.rol, sucursal: cfgUser.sucursal, area: cfgUser.area },
    exp: Date.now() + 8 * 60 * 60 * 1000,
  }, getAuthSecret());
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60, path: "/" });
  return response;
}
