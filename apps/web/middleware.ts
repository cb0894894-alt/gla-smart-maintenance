import { NextRequest, NextResponse } from "next/server";
import { canAccessPath } from "./src/lib/auth/permissions";
import { SESSION_COOKIE, verifySessionToken } from "./src/lib/auth/token";

const PUBLIC_PATHS = ["/login", "/acceso-denegado", "/api/auth/google", "/api/auth/callback/google"];
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return NextResponse.next();
  const secret = process.env.AUTH_SECRET;
  const session = secret ? await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  if (!canAccessPath(session.user.role, pathname)) return NextResponse.redirect(new URL("/acceso-denegado", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|api/auth/session|api/auth/logout).*)"] };
