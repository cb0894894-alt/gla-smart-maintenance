import { requireRole } from "@/lib/auth/server";
import BranchesClient from "./sucursales-client";
export default async function BranchesPage() { await requireRole(["Administrador"]); return <BranchesClient />; }
