import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/token";
export async function POST() { const r = NextResponse.json({ ok: true }); r.cookies.delete(SESSION_COOKIE); return r; }
