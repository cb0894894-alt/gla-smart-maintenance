"use client";

import {
  Activity,
  Boxes,
  ClipboardList,
  Gauge,
  History,
  Home,
  LogOut,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/client";

const navigation: {
  label: string;
  icon: typeof Boxes;
  href: string;
  permission: Permission;
}[] = [
  {
    label: "Activos",
    icon: Boxes,
    href: "/activos",
    permission: "activos:read",
  },
  {
    label: "Reportar falla",
    icon: ClipboardList,
    href: "/reportar-falla",
    permission: "fallas:create",
  },
  {
    label: "Órdenes de trabajo",
    icon: ClipboardList,
    href: "/ordenes-trabajo",
    permission: "ordenes:read",
  },
  {
    label: "Mantenimiento Preventivo",
    icon: ShieldCheck,
    href: "/mantenimiento-preventivo",
    permission: "preventivos:read",
  },
  {
    label: "Inventario",
    icon: Package,
    href: "/inventario",
    permission: "inventario:read",
  },
  {
    label: "Usuarios",
    icon: Users,
    href: "/usuarios",
    permission: "usuarios:read",
  },
  {
    label: "Historial",
    icon: History,
    href: "/historial",
    permission: "historial:read",
  },
  {
    label: "Indicadores",
    icon: Gauge,
    href: "/indicadores",
    permission: "indicadores:read",
  },
];

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { user, permissions, loading, error, logout } = useSession();
  const items = user
    ? [
        { label: "Inicio", icon: Home, href: "/" },
        ...navigation.filter((item) => permissions.includes(item.permission)),
      ]
    : [];
  return (
    <aside className="sticky top-0 z-20 flex border-white/10 bg-slate-950/90 backdrop-blur md:h-screen md:w-72 md:flex-col md:border-r">
      <div className="hidden items-center gap-3 border-b border-white/10 p-6 md:flex">
        <div className="rounded-2xl bg-primary p-2 text-primary-foreground">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">GLA</p>
          <h1 className="font-bold">Smart Maintenance</h1>
        </div>
      </div>
      {user ? (
        <div className="hidden border-b border-white/10 p-4 text-sm md:block">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="truncate text-muted-foreground">{user.email}</p>
          <p className="mt-2 inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {user.role}
          </p>
        </div>
      ) : null}
      <nav className="flex w-full gap-2 overflow-x-auto p-3 md:flex-col md:p-4">
        {loading ? (
          <p className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-muted-foreground">
            Cargando sesión...
          </p>
        ) : null}
        {!loading && error ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!loading && !error && !user ? (
          <p className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-muted-foreground">
            Inicia sesión para ver el menú.
          </p>
        ) : null}
        {!loading && !error && user && items.length === 0 ? (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            No hay módulos disponibles para el rol {user.role}.
          </p>
        ) : null}
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-white",
                active && "bg-primary/15 text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          );
        })}
      </nav>
      {user ? (
        <button
          onClick={logout}
          className="m-4 hidden items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-muted-foreground hover:bg-white/10 hover:text-white md:flex"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      ) : null}
    </aside>
  );
}
