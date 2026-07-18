import { NextRequest, NextResponse } from "next/server";
import { findActiveCfgUser } from "./src/lib/auth/cfg-users";
import { canAccessPath } from "./src/lib/auth/permissions";
import { logAuthFailure } from "./src/lib/auth/server";
import { SESSION_COOKIE, verifySessionToken } from "./src/lib/auth/token";

const PUBLIC_PATHS = [
  "/login",
  "/acceso-denegado",
  "/api/auth/google",
  "/api/auth/callback/google",
];

function redirectToDenied(request: NextRequest) {
  return NextResponse.redirect(new URL("/acceso-denegado", request.url));
}

function redirectToDeniedAndClearSession(request: NextRequest) {
  const response = redirectToDenied(request);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  const session = secret
    ? await verifySessionToken(
        request.cookies.get(SESSION_COOKIE)?.value,
        secret,
      )
    : null;
  if (!session) {
    logAuthFailure("middleware", "missing_or_invalid_session_cookie");
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url),
    );
  }

  const cfgUser = await findActiveCfgUser(session.user.email).catch(() => null);
  if (!cfgUser) {
    logAuthFailure("middleware", "cfg_user_not_active_or_not_found");
    return redirectToDeniedAndClearSession(request);
  }
  if (!canAccessPath(cfgUser.rol, pathname)) {
    logAuthFailure("middleware", "role_cannot_access_path");
    return redirectToDenied(request);
  }

  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|api/auth/session|api/auth/logout).*)",
  ],
};
