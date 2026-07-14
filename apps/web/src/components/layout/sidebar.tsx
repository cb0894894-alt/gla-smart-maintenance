"use client";

import {
  Activity,
  Boxes,
  ClipboardList,
  Gauge,
  History,
  Package,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Activos", href: "/activos", icon: Boxes },
  {
    label: "Órdenes de trabajo",
    href: "/#órdenes-de-trabajo",
    icon: ClipboardList,
  },
  {
    label: "Mantenimiento Preventivo",
    href: "/#mantenimiento-preventivo",
    icon: ShieldCheck,
  },
  { label: "Inventario", href: "/#inventario", icon: Package },
  { label: "Historial", href: "/#historial", icon: History },
  { label: "Indicadores", href: "/#indicadores", icon: Gauge },
];

export function Sidebar() {
  const pathname = usePathname();

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
      <nav className="flex w-full gap-2 overflow-x-auto p-3 md:flex-col md:p-4">
        {navigation.map((item) => {
          const isActive = item.href === "/activos" && pathname === "/activos";

          return (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-white",
                isActive && "bg-primary/15 text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
