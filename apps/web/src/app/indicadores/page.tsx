"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchIndicators,
  filterIndicators,
  getLatestPeriodVariation,
  getPeriodRange,
  type IndicatorRecord,
} from "@/lib/indicators/google-sheets";

const CHART_HEIGHT = 180;

export default function IndicatorsPage() {
  const [records, setRecords] = useState<IndicatorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucursal, setSucursal] = useState("");
  const [periodoDesde, setPeriodoDesde] = useState("");
  const [periodoHasta, setPeriodoHasta] = useState("");

  async function loadIndicators() {
    setIsLoading(true);
    setError(null);
    try {
      setRecords(await fetchIndicators());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar los indicadores reales.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadIndicators();
  }, []);

  const sucursales = useMemo(
    () => Array.from(new Set(records.map((record) => record.sucursal).filter(Boolean))).sort(),
    [records],
  );
  const periodos = useMemo(() => getPeriodRange(records), [records]);
  const filtered = useMemo(
    () => filterIndicators(records, { sucursal, periodoDesde, periodoHasta }),
    [records, sucursal, periodoDesde, periodoHasta],
  );
  const variation = useMemo(() => getLatestPeriodVariation(filtered), [filtered]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">Alpha 0.1 MCA</Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                Indicadores de mantenimiento
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                KPIs reales desde KPI_Indicadores mediante NEXT_PUBLIC_API_URL y accion=indicadores.
              </p>
            </div>
            <BarChart3 className="h-14 w-14 text-primary" />
          </div>
        </header>

        {error ? <Message text={error} onRetry={loadIndicators} /> : null}

        <Card className="mb-6 bg-white/[0.04]">
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={sucursal} onChange={setSucursal} label="Todas las sucursales" options={sucursales} />
              <Select value={periodoDesde} onChange={setPeriodoDesde} label="Periodo desde" options={periodos} />
              <Select value={periodoHasta} onChange={setPeriodoHasta} label="Periodo hasta" options={periodos} />
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Disponibilidad" value={formatPercent(variation.current?.disponibilidadPct)} change={variation.changes.disponibilidadPct} suffix=" pp" />
          <KpiCard label="MTBF" value={`${formatNumber(variation.current?.mtbfHoras)} h`} change={variation.changes.mtbfHoras} suffix=" h" />
          <KpiCard label="MTTR" value={`${formatNumber(variation.current?.mttrHoras)} h`} change={variation.changes.mttrHoras} suffix=" h" inverse />
          <KpiCard label="Cumplimiento preventivo" value={formatPercent(variation.current?.cumplimientoPreventivoPct)} change={variation.changes.cumplimientoPreventivoPct} suffix=" pp" />
          <KpiCard label="Horas de paro" value={`${formatNumber(variation.current?.horasParo)} h`} change={variation.changes.horasParo} suffix=" h" inverse />
          <KpiCard label="Costo mantenimiento" value={formatCurrency(variation.current?.costoMantenimiento)} change={variation.changes.costoMantenimiento} currency inverse />
        </div>

        {isLoading ? (
          <StateRow text="Cargando indicadores reales..." />
        ) : filtered.length ? (
          <>
            <div className="mb-6 grid gap-4 xl:grid-cols-2">
              <LineChart title="Disponibilidad y cumplimiento preventivo" records={filtered} series={[{ key: "disponibilidadPct", label: "Disponibilidad", color: "#2dd4bf" }, { key: "cumplimientoPreventivoPct", label: "Cumplimiento", color: "#a78bfa" }]} suffix="%" />
              <LineChart title="MTBF y MTTR" records={filtered} series={[{ key: "mtbfHoras", label: "MTBF", color: "#22c55e" }, { key: "mttrHoras", label: "MTTR", color: "#f97316" }]} suffix=" h" />
              <LineChart title="Órdenes correctivas contra preventivas" records={filtered} series={[{ key: "ordenesCorrectivas", label: "Correctivas", color: "#f43f5e" }, { key: "ordenesPreventivas", label: "Preventivas", color: "#38bdf8" }]} />
              <LineChart title="Horas de paro y costo de mantenimiento" records={filtered} series={[{ key: "horasParo", label: "Horas paro", color: "#f59e0b" }, { key: "costoMantenimiento", label: "Costo", color: "#14b8a6" }]} />
            </div>
            <IndicatorsTable records={filtered} />
          </>
        ) : (
          <EmptyState onRetry={loadIndicators} />
        )}
      </section>
    </main>
  );
}

function KpiCard({ label, value, change, suffix = "", currency = false, inverse = false }: { label: string; value: string; change: number | null; suffix?: string; currency?: boolean; inverse?: boolean }) {
  const positive = change !== null && change > 0;
  const good = change === null || change === 0 ? null : inverse ? !positive : positive;
  return <Card className="bg-white/[0.04]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value}</p><p className={good === null ? "mt-2 text-xs text-muted-foreground" : good ? "mt-2 text-xs text-emerald-300" : "mt-2 text-xs text-rose-300"}>{change === null ? "Sin periodo anterior" : `${change >= 0 ? "+" : ""}${currency ? formatCurrency(change) : formatNumber(change)}${currency ? "" : suffix} vs anterior`}</p></CardContent></Card>;
}

type NumericKey = keyof Pick<IndicatorRecord, "disponibilidadPct" | "mtbfHoras" | "mttrHoras" | "cumplimientoPreventivoPct" | "ordenesCorrectivas" | "ordenesPreventivas" | "horasParo" | "costoMantenimiento">;

function LineChart({ title, records, series, suffix = "" }: { title: string; records: IndicatorRecord[]; series: { key: NumericKey; label: string; color: string }[]; suffix?: string }) {
  const max = Math.max(1, ...records.flatMap((record) => series.map((serie) => record[serie.key])));
  const width = Math.max(320, records.length * 72);
  return <Card className="bg-white/[0.04]"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><svg role="img" aria-label={title} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} className="h-56 min-w-full"><line x1="36" y1="12" x2="36" y2="148" stroke="rgba(255,255,255,.15)" /><line x1="36" y1="148" x2={width - 12} y2="148" stroke="rgba(255,255,255,.15)" />{series.map((serie) => <polyline key={serie.key} fill="none" stroke={serie.color} strokeWidth="3" points={records.map((record, index) => `${36 + index * ((width - 64) / Math.max(records.length - 1, 1))},${148 - (record[serie.key] / max) * 124}`).join(" ")} />)}{records.map((record, index) => <text key={record.periodo} x={36 + index * ((width - 64) / Math.max(records.length - 1, 1))} y="170" textAnchor="middle" className="fill-slate-400 text-[10px]">{record.periodo}</text>)}</svg></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">{series.map((serie) => <span key={serie.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: serie.color }} />{serie.label}</span>)}<span>Máx: {formatNumber(max)}{suffix}</span></div></CardContent></Card>;
}

function IndicatorsTable({ records }: { records: IndicatorRecord[] }) {
  return <Card className="bg-white/[0.04]"><CardHeader><CardTitle>Tabla mensual de indicadores</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-white/10 text-muted-foreground"><tr>{["Periodo", "Sucursal", "Disponibilidad", "MTBF", "MTTR", "Cumplimiento", "Correctivas", "Preventivas", "Horas paro", "Costo", "Actualización"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{records.map((record) => <tr key={`${record.sucursal}-${record.periodo}`} className="border-t border-white/10"><td className="px-4 py-3 font-semibold text-primary">{record.periodo}</td><td className="px-4 py-3">{record.sucursal || "—"}</td><td className="px-4 py-3">{formatPercent(record.disponibilidadPct)}</td><td className="px-4 py-3">{formatNumber(record.mtbfHoras)} h</td><td className="px-4 py-3">{formatNumber(record.mttrHoras)} h</td><td className="px-4 py-3">{formatPercent(record.cumplimientoPreventivoPct)}</td><td className="px-4 py-3">{record.ordenesCorrectivas}</td><td className="px-4 py-3">{record.ordenesPreventivas}</td><td className="px-4 py-3">{formatNumber(record.horasParo)} h</td><td className="px-4 py-3">{formatCurrency(record.costoMantenimiento)}</td><td className="px-4 py-3">{record.fechaActualizacion || "—"}</td></tr>)}</tbody></table></div></CardContent></Card>;
}

function Select({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) { return <select className="field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }
function Message({ text, onRetry }: { text: string; onRetry: () => void }) { return <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{text}</div><button className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10" onClick={() => void onRetry()}>Reintentar</button></div>; }
function StateRow({ text }: { text: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />{text}</div>; }
function EmptyState({ onRetry }: { onRetry: () => void }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-muted-foreground"><RefreshCw className="mx-auto mb-2 h-6 w-6 text-primary" /><p>No hay indicadores para los filtros seleccionados.</p><button className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10" onClick={() => void onRetry()}>Reintentar</button></div>; }
function formatNumber(value: number | undefined) { return (value ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 2 }); }
function formatPercent(value: number | undefined) { return `${formatNumber(value)}%`; }
function formatCurrency(value: number | undefined) { return (value ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }); }
