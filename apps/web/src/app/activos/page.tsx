"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAssets, type Asset } from "@/lib/assets";

const PAGE_SIZE = 25;
const ALL_OPTION = "Todos";

function uniqueOptions(assets: Asset[], key: keyof Asset) {
  return Array.from(
    new Set(assets.map((asset) => asset[key]).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es"));
}

function statusBadgeClass(value: string) {
  if (value === "Operando") {
    return "bg-emerald-500/15 text-emerald-200";
  }

  if (!value) {
    return "bg-slate-500/20 text-slate-200";
  }

  return "bg-amber-500/20 text-amber-100";
}

function criticalityBadgeClass(value: string) {
  return value === "Alta"
    ? "bg-red-500/20 text-red-100"
    : "bg-primary/15 text-primary";
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState(ALL_OPTION);
  const [statusFilter, setStatusFilter] = useState(ALL_OPTION);
  const [criticalityFilter, setCriticalityFilter] = useState(ALL_OPTION);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    fetchAssets()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setAssets(data);
        setError(null);
      })
      .catch((currentError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          currentError instanceof Error
            ? currentError.message
            : "No fue posible cargar los activos.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, areaFilter, statusFilter, criticalityFilter]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesQuery =
        !normalizedQuery ||
        asset.codigo.toLowerCase().includes(normalizedQuery) ||
        asset.nombre.toLowerCase().includes(normalizedQuery);
      const matchesArea =
        areaFilter === ALL_OPTION || asset.area === areaFilter;
      const matchesStatus =
        statusFilter === ALL_OPTION || asset.estado === statusFilter;
      const matchesCriticality =
        criticalityFilter === ALL_OPTION ||
        asset.criticidad === criticalityFilter;

      return matchesQuery && matchesArea && matchesStatus && matchesCriticality;
    });
  }, [areaFilter, assets, criticalityFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const operatingAssets = assets.filter(
    (asset) => asset.estado === "Operando",
  ).length;
  const unavailableAssets = assets.length - operatingAssets;
  const highCriticalityAssets = assets.filter(
    (asset) => asset.criticidad === "Alta",
  ).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 bg-primary/15 text-primary">
              Google Sheets · Activos reales
            </Badge>
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Gestión de activos
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Consulta, filtra y controla los activos cargados desde Google
              Sheets mediante la acción accion=activos.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-muted-foreground">
            <p>Fuente</p>
            <strong className="text-white">NEXT_PUBLIC_API_URL</strong>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AssetMetric
            icon={<Boxes />}
            label="Total de activos"
            value={assets.length}
          />
          <AssetMetric
            icon={<Wrench />}
            label="Activos Operando"
            value={operatingAssets}
          />
          <AssetMetric
            icon={<AlertTriangle />}
            label="Fuera de operación u otro estado"
            value={unavailableAssets}
          />
          <AssetMetric
            icon={<ShieldAlert />}
            label="Criticidad Alta"
            value={highCriticalityAssets}
          />
        </div>

        <Card className="mt-6 bg-white/[0.04]">
          <CardHeader>
            <CardTitle className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <span>Inventario de activos</span>
              <span className="text-sm font-medium text-muted-foreground">
                {filteredAssets.length} resultados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <input
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por código o nombre"
                  value={query}
                />
              </label>
              <AssetSelect
                label="Área"
                onChange={setAreaFilter}
                options={uniqueOptions(assets, "area")}
                value={areaFilter}
              />
              <AssetSelect
                label="Estado"
                onChange={setStatusFilter}
                options={uniqueOptions(assets, "estado")}
                value={statusFilter}
              />
              <AssetSelect
                label="Criticidad"
                onChange={setCriticalityFilter}
                options={uniqueOptions(assets, "criticidad")}
                value={criticalityFilter}
              />
            </div>

            {isLoading ? (
              <StateMessage
                title="Cargando activos"
                message="Consultando Google Sheets..."
              />
            ) : error ? (
              <StateMessage
                title="No se pudieron cargar los activos"
                message={error}
              />
            ) : filteredAssets.length === 0 ? (
              <StateMessage
                title="Sin activos para mostrar"
                message="Ajusta la búsqueda o los filtros para ver resultados."
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full text-left text-sm">
                      <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Área</th>
                          <th className="px-4 py-3">Marca</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Criticidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {paginatedAssets.map((asset, index) => (
                          <tr
                            className="bg-white/[0.02] transition hover:bg-white/[0.06]"
                            key={`${asset.codigo}-${index}`}
                          >
                            <td className="px-4 py-4 font-semibold text-white">
                              {asset.codigo || "—"}
                            </td>
                            <td className="px-4 py-4">{asset.nombre || "—"}</td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {asset.tipo || "—"}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {asset.area || "—"}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {asset.marca || "—"}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={statusBadgeClass(asset.estado)}>
                                {asset.estado || "Sin estado"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge
                                className={criticalityBadgeClass(
                                  asset.criticidad,
                                )}
                              >
                                {asset.criticidad || "Sin criticidad"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Página {currentPage} de {totalPages} · mostrando{" "}
                    {paginatedAssets.length} de {filteredAssets.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-2xl border border-white/10 px-4 py-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      type="button"
                    >
                      Anterior
                    </button>
                    <button
                      className="rounded-2xl border border-white/10 px-4 py-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                      }
                      type="button"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function AssetMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="bg-white/[0.04]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-primary/15 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <strong className="text-3xl font-black text-white">{value}</strong>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <select
        className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option>{ALL_OPTION}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StateMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/50 p-8 text-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
