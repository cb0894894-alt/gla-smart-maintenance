"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardList, Loader2, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  filterWorkOrders,
  fetchWorkOrders,
  getWorkOrderIndicators,
  updateWorkOrderStatus,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/work-orders/google-sheets";

const PAGE_SIZE = 25;

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]),
    [isLoading, setIsLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [estado, setEstado] = useState(""),
    [prioridad, setPrioridad] = useState(""),
    [area, setArea] = useState(""),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkOrder | null>(null),
    [nextStatus, setNextStatus] = useState<WorkOrderStatus>("Abierta"),
    [closingNote, setClosingNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false),
    [updateMessage, setUpdateMessage] = useState<string | null>(null),
    [updateError, setUpdateError] = useState<string | null>(null);
  async function loadOrders() {
    setIsLoading(true);
    try {
      setOrders(await fetchWorkOrders());
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar las OT reales.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void loadOrders();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, estado, prioridad, area]);
  useEffect(() => {
    if (selected)
      setNextStatus((selected.estado || "Abierta") as WorkOrderStatus);
    setClosingNote("");
    setUpdateError(null);
    setUpdateMessage(null);
  }, [selected]);
  const filtered = useMemo(
    () => filterWorkOrders(orders, { search, estado, prioridad, area }),
    [orders, search, estado, prioridad, area],
  );
  const indicators = useMemo(() => getWorkOrderIndicators(orders), [orders]);
  const areas = useMemo(
    () => Array.from(new Set(orders.map((o) => o.area).filter(Boolean))).sort(),
    [orders],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  async function handleStatusUpdate() {
    if (!selected || isUpdating) return;
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateMessage(null);
    try {
      await updateWorkOrderStatus({
        folio: selected.folio,
        estado: nextStatus,
        notaCierre: closingNote,
      });
      setUpdateMessage(`Estado actualizado a ${nextStatus}.`);
      await loadOrders();
      setSelected((current) =>
        current
          ? {
              ...current,
              estado: nextStatus,
              notaCierre:
                nextStatus === "Cerrada" ? closingNote : current.notaCierre,
            }
          : current,
      );
    } catch (caught) {
      setUpdateError(
        caught instanceof Error
          ? caught.message
          : "No se pudo actualizar la OT.",
      );
    } finally {
      setIsUpdating(false);
    }
  }
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">
            Alpha 0.1 MCA
          </Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                Órdenes de Trabajo
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Consulta órdenes reales desde OT_OrdenesTrabajo, filtra y
                actualiza únicamente su estado.
              </p>
            </div>
            <ClipboardList className="h-14 w-14 text-primary" />
          </div>
        </header>
        {error ? <Message tone="error" text={error} /> : null}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", indicators.total],
            ["Abiertas", indicators.abiertas],
            ["En proceso", indicators.enProceso],
            ["Cerradas", indicators.cerradas],
            ["Prioridad Crítica", indicators.prioridadCritica],
          ].map(([label, value]) => (
            <Card key={label} className="bg-white/[0.04]">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Listado real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="field pl-9"
                  placeholder="Buscar folio, activo o reporta"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Select
                value={estado}
                onChange={setEstado}
                label="Todos los estados"
                options={WORK_ORDER_STATUSES}
              />
              <Select
                value={prioridad}
                onChange={setPrioridad}
                label="Todas las prioridades"
                options={WORK_ORDER_PRIORITIES}
              />
              <Select
                value={area}
                onChange={setArea}
                label="Todas las áreas"
                options={areas}
              />
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-white/10 text-muted-foreground">
                  <tr>
                    {[
                      "Folio",
                      "Fecha",
                      "Activo",
                      "Área",
                      "Reporta",
                      "Prioridad",
                      "Condición",
                      "Estado",
                      "",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        Cargando OT reales...
                      </td>
                    </tr>
                  ) : pageOrders.length ? (
                    pageOrders.map((order) => (
                      <tr
                        key={order.folio}
                        className="border-t border-white/10"
                      >
                        <td className="px-4 py-3 font-semibold text-primary">
                          {order.folio}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(order.fechaHoraReporte)}
                        </td>
                        <td className="px-4 py-3">{order.activo}</td>
                        <td className="px-4 py-3">{order.area}</td>
                        <td className="px-4 py-3">{order.reporta}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-primary/15 text-primary">
                            {order.prioridad}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{order.condicionEquipo}</td>
                        <td className="px-4 py-3">{order.estado}</td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
                            onClick={() => setSelected(order)}
                          >
                            Detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No hay OT para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {pageOrders.length} de {filtered.length} registros ·
                página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-40"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
        {selected ? (
          <div className="fixed inset-0 z-30 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur">
            <Card className="mx-auto max-w-4xl bg-slate-950">
              <CardHeader>
                <CardTitle>Detalle {selected.folio}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries({
                    Folio: selected.folio,
                    Fecha: formatDate(selected.fechaHoraReporte),
                    Código: selected.codigoActivo,
                    Activo: selected.activo,
                    Área: selected.area,
                    Criticidad: selected.criticidad,
                    Reporta: selected.reporta,
                    Prioridad: selected.prioridad,
                    Condición: selected.condicionEquipo,
                    Estado: selected.estado,
                    Origen: selected.origen,
                    Observaciones: selected.observaciones || "—",
                    "Descripción de falla": selected.descripcionFalla,
                    "Nota de cierre": selected.notaCierre || "—",
                  }).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-2xl border border-white/10 p-3"
                    >
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="mt-1 font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <h3 className="font-bold">Actualizar estado</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Select
                      value={nextStatus}
                      onChange={(v) => setNextStatus(v as WorkOrderStatus)}
                      label="Estado"
                      options={WORK_ORDER_STATUSES}
                    />
                    {nextStatus === "Cerrada" ? (
                      <textarea
                        className="field min-h-24"
                        placeholder="Nota breve de cierre obligatoria"
                        value={closingNote}
                        onChange={(e) => setClosingNote(e.target.value)}
                      />
                    ) : null}
                  </div>
                  {updateError ? (
                    <Message tone="error" text={updateError} />
                  ) : null}
                  {updateMessage ? (
                    <Message tone="success" text={updateMessage} />
                  ) : null}
                  <button
                    className="mt-3 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={isUpdating}
                    onClick={handleStatusUpdate}
                  >
                    {isUpdating ? "Actualizando..." : "Guardar estado"}
                  </button>
                </div>
                <button
                  className="rounded-xl border border-white/10 px-4 py-2"
                  onClick={() => setSelected(null)}
                >
                  Cerrar detalle
                </button>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
function Message({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      className={`mt-3 flex items-center gap-2 rounded-2xl border p-3 text-sm ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}
    >
      <AlertCircle className="h-4 w-4" />
      {text}
    </div>
  );
}
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-MX");
}
