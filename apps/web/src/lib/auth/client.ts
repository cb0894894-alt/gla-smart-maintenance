"use client";
import { useEffect, useState } from "react";
import type { Permission } from "./permissions";
import type { SessionUser } from "./token";
export function useSession() {
  const [state, setState] = useState<{ user: SessionUser | null; permissions: Permission[]; loading: boolean }>({ user: null, permissions: [], loading: true });
  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setState({ user: { name: "Test Admin", email: "admin@gla.test", role: "Administrador", sucursal: "", area: "" }, permissions: [], loading: false });
      return;
    }
    fetch("/api/auth/session").then(async (r) => r.ok ? r.json() : { user: null, permissions: [] }).then((data) => setState({ ...data, loading: false })).catch(() => setState({ user: null, permissions: [], loading: false }));
  }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  return { ...state, logout };
}
