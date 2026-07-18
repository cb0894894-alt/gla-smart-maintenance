import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getPermissions } from "@/lib/auth/permissions";
export async function GET() {
  const session = await getServerSession();
  return NextResponse.json(session ? { user: session.user, permissions: getPermissions(session.user.role) } : { user: null, permissions: [] }, { status: session ? 200 : 401 });
}
