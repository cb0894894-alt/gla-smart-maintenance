"use client";

import { useMemo } from "react";
import { Ban, Home, LogOut } from "lucide-react";
import { getDefaultPathForRole } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/client";

export default function AccessDeniedPage() {
  const { user, loading, logout } = useSession();
  const safeHref = useMemo(
    () => (user ? getDefaultPathForRole(user.role) : "/login"),
    [user],
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_30rem)] p-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/90 p-8 text-center shadow-2xl shadow-red-950/30">
        <Ban className="mx-auto h-12 w-12 text-red-300" />
        <h1 className="mt-4 text-3xl font-black">Acceso denegado</h1>
        <p className="mt-3 text-muted-foreground">
          Tu usuario no tiene permiso para abrir este módulo. Por seguridad, no
          se renderiza contenido protegido en esta pantalla.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            href={safeHref}
          >
            <Home className="h-4 w-4" />
            {loading ? "Cargando ruta..." : "Ir a mi inicio"}
          </a>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-muted-foreground hover:bg-white/10 hover:text-white"
            onClick={logout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
