"use client";
import { useEffect, useState } from "react";
import { PERMISSIONS, type Permission } from "./permissions";
import type { SessionUser } from "./token";

type SessionState = {
  user: SessionUser | null;
  permissions: Permission[];
  loading: boolean;
  error: string | null;
};

export function useSession() {
  const [state, setState] = useState<SessionState>({ user: null, permissions: [], loading: true, error: null });
  useEffect(() => {
    let active = true;
    async function loadSession() {
      if (process.env.NODE_ENV === "test" && process.env.NEXT_PUBLIC_TEST_SESSION !== "fetch") {
        setState({ user: { name: "Test Admin", email: "admin@gla.test", role: "Administrador", sucursal: "", area: "" }, permissions: [...PERMISSIONS], loading: false, error: null });
        return;
      }
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          if (response.status === 401 && window.location.pathname !== "/login") {
            const next = `${window.location.pathname}${window.location.search}`;
            window.location.replace(`/login?next=${encodeURIComponent(next)}`);
            return;
          }
          setState({ user: null, permissions: [], loading: false, error: data.error ?? "No se encontró una sesión activa." });
          return;
        }
        setState({ user: data.user ?? null, permissions: data.permissions ?? [], loading: false, error: null });
      } catch {
        if (active) setState({ user: null, permissions: [], loading: false, error: "No se pudo cargar la sesión." });
      }
    }
    loadSession();
    return () => { active = false; };
  }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  return { ...state, logout };
}
