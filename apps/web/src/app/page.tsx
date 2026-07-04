import type React from "react";
import { AlertTriangle, CheckCircle2, Clock3, TrendingUp } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inventory, modules, workOrders } from "@/data/mock";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 bg-primary/15 text-primary">
              PWA lista para operación
            </Badge>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Centro de mantenimiento inteligente
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Monitorea activos, órdenes, inventario e indicadores con datos
              simulados para arrancar el producto inmediatamente.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric icon={<CheckCircle2 />} label="SLA" value="98%" />
            <Metric icon={<Clock3 />} label="MTTR" value="2.4h" />
            <Metric icon={<TrendingUp />} label="Ahorro" value="18%" />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Card
              id={module.name.toLowerCase().replaceAll(" ", "-")}
              key={module.name}
              className="bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.07]"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {module.name}
                  <Badge className="text-primary">{module.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-black">{module.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {module.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="bg-white/[0.04]">
            <CardHeader>
              <CardTitle>Órdenes de trabajo prioritarias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-5 sm:items-center"
                >
                  <strong>{order.id}</strong>
                  <span className="sm:col-span-2">{order.asset}</span>
                  <span className="text-muted-foreground">{order.owner}</span>
                  <Badge
                    className={
                      order.priority === "Crítica"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-amber-500/20 text-amber-100"
                    }
                  >
                    {order.priority} · {order.eta}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-white/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-300" /> Inventario
                crítico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inventory.map((item) => (
                <div key={item.sku}>
                  <div className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span>
                      {item.stock}/{item.min}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${Math.min((item.stock / item.min) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4 text-sm text-muted-foreground">
      {" "}
      <div className="mx-auto mb-2 h-5 w-5 text-primary">{icon}</div>
      <p>{label}</p>
      <strong className="text-xl text-white">{value}</strong>
    </div>
  );
}
