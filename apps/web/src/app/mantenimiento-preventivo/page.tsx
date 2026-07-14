"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, Loader2, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAssets, type Asset } from "@/lib/assets/google-sheets";
import {
  createPreventivePlan,
  fetchPreventivePlans,
  filterPreventivePlans,
  getAssetLabel,
  getPreventiveIndicators,
  PM_FREQUENCY_UNITS,
  PM_PRIORITIES,
  PM_STATUSES,
  registerPreventiveExecution,
  type PreventiveMaintenanceFrequencyUnit,
  type PreventiveMaintenancePriority,
  type PreventivePlan,
} from "@/lib/preventive-maintenance/google-sheets";

const PAGE_SIZE = 25;
const today = () => new Date().toISOString().slice(0, 10);

export default function PreventiveMaintenancePage() {
  const [plans, setPlans] = useState<PreventivePlan[]>([]),
    [assets, setAssets] = useState<Asset[]>([]),
    [isLoading, setIsLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(""),
    [estado, setEstado] = useState(""),
    [prioridad, setPrioridad] = useState(""),
    [area, setArea] = useState(""),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PreventivePlan | null>(null),
    [executionDate, setExecutionDate] = useState(today()),
    [executionNotes, setExecutionNotes] = useState("");
  const [form, setForm] = useState({
    assetCode: "",
    tarea: "",
    frecuencia: 1,
    unidadFrecuencia: "Meses" as PreventiveMaintenanceFrequencyUnit,
    ultimaEjecucion: today(),
    responsable: "",
    prioridad: "Media" as PreventiveMaintenancePriority,
    duracionEstimada: "",
    instrucciones: "",
    observaciones: "",
  });
  const [message, setMessage] = useState<string | null>(null),
    [actionError, setActionError] = useState<string | null>(null),
    [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [nextPlans, nextAssets] = await Promise.all([
        fetchPreventivePlans(),
        fetchAssets(),
      ]);
      setPlans(nextPlans);
      setAssets(nextAssets);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los preventivos reales.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    void loadData();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, estado, prioridad, area]);

  const filtered = useMemo(
    () => filterPreventivePlans(plans, { search, estado, prioridad, area }),
    [plans, search, estado, prioridad, area],
  );
  const indicators = useMemo(() => getPreventiveIndicators(plans), [plans]);
  const areas = useMemo(
    () => Array.from(new Set(plans.map((p) => p.area).filter(Boolean))).sort(),
    [plans],
  );
  const selectedAsset = assets.find((asset) => asset.codigo === form.assetCode);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagePlans = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate() {
    if (!selectedAsset || isSaving) return;
    setIsSaving(true);
    setActionError(null);
    setMessage(null);
    try {
      const result = await createPreventivePlan({
        ...form,
        assetName: selectedAsset.nombre,
        assetArea: selectedAsset.area,
      });
      setMessage(`Plan preventivo creado: ${result.idPM}.`);
      setForm((current) => ({
        ...current,
        assetCode: "",
        tarea: "",
        responsable: "",
        duracionEstimada: "",
        instrucciones: "",
        observaciones: "",
      }));
      await loadData();
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "No se pudo crear el plan preventivo.",
      );
    } finally {
      setIsSaving(false);
    }
  }
  async function handleExecution() {
    if (!selected || isSaving) return;
    setIsSaving(true);
    setActionError(null);
    setMessage(null);
    try {
      await registerPreventiveExecution({
        idPM: selected.idPM,
        fechaEjecucion: executionDate,
        observaciones: executionNotes,
      });
      setMessage(`Ejecución registrada para ${selected.idPM}.`);
      setExecutionNotes("");
      setSelected(null);
      await loadData();
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "No se pudo registrar la ejecución.",
      );
    } finally {
      setIsSaving(false);
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
                Mantenimiento Preventivo
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Gestiona planes reales desde PM_Preventivos, crea rutinas por
                activo y registra ejecuciones sin sobrescribir información
                existente.
              </p>
            </div>
            <CalendarCheck className="h-14 w-14 text-primary" />
          </div>
        </header>
        {error ? <Message tone="error" text={error} /> : null}
        {actionError ? <Message tone="error" text={actionError} /> : null}
        {message ? <Message tone="success" text={message} /> : null}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", indicators.total],
            ["Activos", indicators.activos],
            ["Vencidos", indicators.vencidos],
            ["Próximos 7 días", indicators.proximos],
            ["Completados", indicators.completados],
          ].map(([label, value]) => (
            <Card key={label} className="bg-white/[0.04]">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
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
                    placeholder="Buscar IdPM, activo, tarea o responsable"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <Select
                  value={estado}
                  onChange={setEstado}
                  label="Todos los estados"
                  options={PM_STATUSES}
                />
                <Select
                  value={prioridad}
                  onChange={setPrioridad}
                  label="Todas las prioridades"
                  options={PM_PRIORITIES}
                />
                <Select
                  value={area}
                  onChange={setArea}
                  label="Todas las áreas"
                  options={areas}
                />
              </div>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="bg-white/10 text-muted-foreground">
                    <tr>
                      {[
                        "IdPM",
                        "Activo",
                        "Área",
                        "Tarea",
                        "Frecuencia",
                        "Última",
                        "Próxima",
                        "Responsable",
                        "Estado",
                        "Prioridad",
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
                        <td colSpan={11} className="px-4 py-8 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                          Cargando preventivos reales...
                        </td>
                      </tr>
                    ) : pagePlans.length ? (
                      pagePlans.map((plan) => (
                        <tr
                          key={plan.idPM}
                          className="border-t border-white/10"
                        >
                          <td className="px-4 py-3 font-semibold text-primary">
                            {plan.idPM}
                          </td>
                          <td className="px-4 py-3">
                            {plan.codigoActivo} · {plan.activo}
                          </td>
                          <td className="px-4 py-3">{plan.area}</td>
                          <td className="px-4 py-3">{plan.tarea}</td>
                          <td className="px-4 py-3">
                            Cada {plan.frecuencia} {plan.unidadFrecuencia}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(plan.ultimaEjecucion)}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(plan.proximaEjecucion)}
                          </td>
                          <td className="px-4 py-3">{plan.responsable}</td>
                          <td className="px-4 py-3">{plan.estado}</td>
                          <td className="px-4 py-3">
                            <Badge className="bg-primary/15 text-primary">
                              {plan.prioridad}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
                              onClick={() => setSelected(plan)}
                            >
                              Registrar ejecución
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No hay planes para los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Mostrando {pagePlans.length} de {filtered.length} registros ·
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
          <Card className="bg-white/[0.04]">
            <CardHeader>
              <CardTitle>Crear plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={form.assetCode}
                onChange={(assetCode) =>
                  setForm((current) => ({ ...current, assetCode }))
                }
                label="Selecciona un activo real"
                options={assets.map(getAssetLabel)}
                values={assets.map((asset) => asset.codigo)}
              />
              <input
                className="field"
                placeholder="Tarea"
                value={form.tarea}
                onChange={(e) => setForm({ ...form, tarea: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="field"
                  type="number"
                  min={1}
                  value={form.frecuencia}
                  onChange={(e) =>
                    setForm({ ...form, frecuencia: Number(e.target.value) })
                  }
                />
                <Select
                  value={form.unidadFrecuencia}
                  onChange={(unidadFrecuencia) =>
                    setForm({
                      ...form,
                      unidadFrecuencia:
                        unidadFrecuencia as PreventiveMaintenanceFrequencyUnit,
                    })
                  }
                  label="Unidad"
                  options={PM_FREQUENCY_UNITS}
                />
              </div>
              <label className="text-sm text-muted-foreground">
                Última ejecución
                <input
                  className="field mt-1"
                  type="date"
                  value={form.ultimaEjecucion}
                  onChange={(e) =>
                    setForm({ ...form, ultimaEjecucion: e.target.value })
                  }
                />
              </label>
              <input
                className="field"
                placeholder="Responsable"
                value={form.responsable}
                onChange={(e) =>
                  setForm({ ...form, responsable: e.target.value })
                }
              />
              <Select
                value={form.prioridad}
                onChange={(prioridad) =>
                  setForm({
                    ...form,
                    prioridad: prioridad as PreventiveMaintenancePriority,
                  })
                }
                label="Prioridad"
                options={PM_PRIORITIES}
              />
              <input
                className="field"
                placeholder="Duración estimada"
                value={form.duracionEstimada}
                onChange={(e) =>
                  setForm({ ...form, duracionEstimada: e.target.value })
                }
              />
              <textarea
                className="field min-h-24"
                placeholder="Instrucciones"
                value={form.instrucciones}
                onChange={(e) =>
                  setForm({ ...form, instrucciones: e.target.value })
                }
              />
              <textarea
                className="field min-h-20"
                placeholder="Observaciones"
                value={form.observaciones}
                onChange={(e) =>
                  setForm({ ...form, observaciones: e.target.value })
                }
              />
              <button
                className="w-full rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                disabled={isSaving || !selectedAsset}
                onClick={handleCreate}
              >
                {isSaving ? "Guardando..." : "Crear preventivo"}
              </button>
            </CardContent>
          </Card>
        </div>
        {selected ? (
          <div className="fixed inset-0 z-30 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur">
            <Card className="mx-auto max-w-2xl bg-slate-950">
              <CardHeader>
                <CardTitle>Registrar ejecución {selected.idPM}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {selected.activo} · {selected.tarea}
                </p>
                <label className="text-sm text-muted-foreground">
                  Fecha de ejecución
                  <input
                    className="field mt-1"
                    type="date"
                    value={executionDate}
                    onChange={(e) => setExecutionDate(e.target.value)}
                  />
                </label>
                <textarea
                  className="field min-h-24"
                  placeholder="Observaciones de la ejecución"
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={isSaving}
                    onClick={handleExecution}
                  >
                    Registrar
                  </button>
                  <button
                    className="rounded-xl border border-white/10 px-4 py-2"
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </button>
                </div>
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
  values,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly string[];
  values?: readonly string[];
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map((option, index) => (
        <option
          key={values?.[index] || option}
          value={values?.[index] || option}
        >
          {option}
        </option>
      ))}
    </select>
  );
}
function Message({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      className={`mb-3 flex items-center gap-2 rounded-2xl border p-3 text-sm ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}
    >
      <AlertCircle className="h-4 w-4" />
      {text}
    </div>
  );
}
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-MX");
}
