import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getPermissions, normalizeRole } from "@/lib/auth/permissions";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ user: null, permissions: [], error: "No se encontró una sesión activa." }, { status: 401 });
  const role = normalizeRole(session.user.role);
  if (!role) return NextResponse.json({ user: null, permissions: [], error: "El rol de la sesión no es válido." }, { status: 401 });
  const user = { ...session.user, role };
  return NextResponse.json({ user, permissions: getPermissions(role) });
}
