import { requireRole } from "@/lib/auth/server";
import UsersClient from "./usuarios-client";

export default async function UsersPage() {
  await requireRole(["Administrador"]);

  return <UsersClient />;
}
