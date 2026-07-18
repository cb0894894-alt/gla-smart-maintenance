import { requireRole } from "@/lib/auth/server";
import IndicatorsClient from "./indicadores-client";

export default async function IndicatorsPage() {
  await requireRole(["Administrador", "Supervisor"]);

  return <IndicatorsClient />;
}
