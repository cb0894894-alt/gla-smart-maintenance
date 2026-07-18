import { NextRequest, NextResponse } from "next/server";
import { canPerformApiAction } from "@/lib/auth/permissions";
import { getServerSession, logAuthFailure } from "@/lib/auth/server";

function getUpstreamApiUrl() {
  const apiUrl =
    process.env.GOOGLE_APPS_SCRIPT_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl)
    throw new Error("GOOGLE_APPS_SCRIPT_API_URL no está configurada.");
  return apiUrl;
}

function denied() {
  return NextResponse.json(
    { ok: false, error: "Acceso denegado" },
    { status: 403 },
  );
}

async function requireAction(action: string) {
  const session = await getServerSession();
  if (!session) return false;
  const allowed = canPerformApiAction(session.user.role, action);
  if (!allowed)
    logAuthFailure("api/google-sheets", `role_cannot_perform_${action}`);
  return allowed;
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("accion") ?? "";
  if (!(await requireAction(action))) return denied();

  const upstream = new URL(getUpstreamApiUrl());
  request.nextUrl.searchParams.forEach((value, key) =>
    upstream.searchParams.set(key, value),
  );
  const response = await fetch(upstream.toString(), {
    headers: { Accept: "application/json" },
  });
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  let action = "";
  try {
    const parsed = JSON.parse(body) as { accion?: unknown };
    action = typeof parsed.accion === "string" ? parsed.accion : "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "Solicitud inválida" },
      { status: 400 },
    );
  }
  if (!(await requireAction(action))) return denied();

  const response = await fetch(getUpstreamApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
