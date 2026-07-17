"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, History, Loader2, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchMaintenanceHistory,
  filterMaintenanceHistory,
  getMaintenanceHistoryIndicators,
  type MaintenanceHistoryRecord,
} from "@/lib/maintenance-history/google-sheets";

const PAGE_SIZE = 25;

export default function MaintenanceHistoryPage() {
  const [records, setRecords] = useState<MaintenanceHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tipoMantenimiento, setTipoMantenimiento] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [estadoFinal, setEstadoFinal] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MaintenanceHistoryRecord | null>(
    null,
  );

  async function loadHistory() {
    setIsLoading(true);
    setError(null);
    try {
      setRecords(await fetchMaintenanceHistory());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar el historial real.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, tipoMantenimiento, tecnico, estadoFinal]);

  const filtered = useMemo(
    () =>
      filterMaintenanceHistory(records, {
        search,
        tipoMantenimiento,
        tecnico,
        estadoFinal,
      }),
    [records, search, tipoMantenimiento, tecnico, estadoFinal],
  );
  const indicators = useMemo(
    () => getMaintenanceHistoryIndicators(records),
    [records],
  );
  const tipos = useOptions(records, "tipoMantenimiento");
  const tecnicos = useOptions(records, "tecnico");
  const estados = useOptions(records, "estadoFinal");
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRecords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                Historial de mantenimiento
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Consulta servicios cerrados reales desde MNT_Historial mediante
                NEXT_PUBLIC_API_URL y accion=historial.
              </p>
            </div>
            <History className="h-14 w-14 text-primary" />
          </div>
        </header>

        {error ? <Message text={error} onRetry={loadHistory} /> : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total de servicios", indicators.totalServicios],
            ["Correctivos", indicators.correctivos],
            ["Preventivos", indicators.preventivos],
            ["Horas paro", indicators.horasParo.toLocaleString("es-MX")],
            ["Costo total", formatCurrency(indicators.costoTotal)],
          ].map(([label, value]) => (
            <Indicator
              key={label}
              label={String(label)}
              value={String(value)}
            />
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
                  placeholder="Buscar folio, código o activo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Select
                value={tipoMantenimiento}
                onChange={setTipoMantenimiento}
                label="Todos los tipos"
                options={tipos}
              />
              <Select
                value={tecnico}
                onChange={setTecnico}
                label="Todos los técnicos"
                options={tecnicos}
              />
              <Select
                value={estadoFinal}
                onChange={setEstadoFinal}
                label="Todos los estados finales"
                options={estados}
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-white/10 text-muted-foreground">
                  <tr>
                    {[
                      "Fecha",
                      "Folio",
                      "Activo",
                      "Tipo",
                      "Técnico",
                      "Tiempo de paro",
                      "Costo total",
                      "Estado final",
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
                        Cargando historial real...
                      </td>
                    </tr>
                  ) : pageRecords.length ? (
                    pageRecords.map((record) => (
                      <tr
                        key={`${record.idHistorial}-${record.folioOT}`}
                        className="border-t border-white/10 align-top"
                      >
                        <td className="px-4 py-3">
                          {formatDate(record.fechaCierre)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {record.folioOT || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-medium">
                            {record.activo || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {record.codigoActivo || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.tipoMantenimiento || "—"}
                        </td>
                        <td className="px-4 py-3">{record.tecnico || "—"}</td>
                        <td className="px-4 py-3">
                          {record.tiempoParoHoras.toLocaleString("es-MX")} h
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(record.costoTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-primary/15 text-primary">
                            {record.estadoFinal || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
                            onClick={() => setSelected(record)}
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
                        <p>No hay registros para los filtros seleccionados.</p>
                        <button
                          className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
                          onClick={() => void loadHistory()}
                        >
                          Reintentar
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando {pageRecords.length} de {filtered.length} registros ·
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
      </section>
      {selected ? (
        <Detail record={selected} onClose={() => setSelected(null)} />
      ) : null}
    </main>
  );
}

function useOptions(
  records: MaintenanceHistoryRecord[],
  field: keyof MaintenanceHistoryRecord,
) {
  return useMemo(
    () =>
      Array.from(
        new Set(
          records.map((record) => String(record[field] || "")).filter(Boolean),
        ),
      ).sort(),
    [records, field],
  );
}
function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/[0.04]">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
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
function Message({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {text}
      </div>
      <button
        className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
        onClick={() => void onRetry()}
      >
        Reintentar
      </button>
    </div>
  );
}
function Detail({
  record,
  onClose,
}: {
  record: MaintenanceHistoryRecord;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ["IdHistorial", record.idHistorial],
    ["FolioOT", record.folioOT],
    ["FechaCierre", formatDate(record.fechaCierre)],
    ["CodigoActivo", record.codigoActivo],
    ["Activo", record.activo],
    ["TipoMantenimiento", record.tipoMantenimiento],
    ["FallaDetectada", record.fallaDetectada],
    ["TrabajoRealizado", record.trabajoRealizado],
    ["Tecnico", record.tecnico],
    ["TiempoParoHoras", `${record.tiempoParoHoras.toLocaleString("es-MX")} h`],
    ["CostoRefacciones", formatCurrency(record.costoRefacciones)],
    ["CostoManoObra", formatCurrency(record.costoManoObra)],
    ["CostoTotal", formatCurrency(record.costoTotal)],
    ["EstadoFinal", record.estadoFinal],
    ["Observaciones", record.observaciones],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 p-4 backdrop-blur">
      <div className="mx-auto max-h-[90vh] max-w-3xl overflow-auto rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-primary/15 text-primary">
              Detalle completo
            </Badge>
            <h3 className="mt-2 text-2xl font-bold">
              {record.folioOT || record.idHistorial}
            </h3>
          </div>
          <button
            className="rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
function formatCurrency(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-MX");
}
