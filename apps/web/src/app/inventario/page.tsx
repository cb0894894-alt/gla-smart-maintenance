import { requireRole } from "@/lib/auth/server";
import InventoryClient from "./inventario-client";

export default async function InventoryPage() {
  await requireRole(["Administrador", "Supervisor"]);

  return <InventoryClient />;
}
