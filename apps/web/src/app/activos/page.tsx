"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAssets, type Asset } from "@/lib/assets/google-sheets";

const PAGE_SIZE = 25;

function uniqueOptions(assets: Asset[], field: keyof Asset) {
  return Array.from(
    new Set(assets.map((asset) => asset[field]).filter(Boolean)),
  ).sort();
}

function matchesText(asset: Asset, search: string) {
  const text = search.trim().toLowerCase();
  return (
    !text ||
    asset.codigo.toLowerCase().includes(text) ||
    asset.nombre.toLowerCase().includes(text)
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [estado, setEstado] = useState("");
  const [criticidad, setCriticidad] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchAssets()
      .then((loadedAssets) => {
        setAssets(loadedAssets);
        setError(null);
      })
      .catch((loadError: unknown) => {
        console.error("Unable to load assets from Google Sheets.", loadError);
        setError("No se pudieron cargar los activos desde Google Sheets.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, area, estado, criticidad]);

  const filteredAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          matchesText(asset, search) &&
          (!area || asset.area === area) &&
          (!estado || asset.estado === estado) &&
          (!criticidad || asset.criticidad === criticidad),
      ),
    [area, assets, criticidad, estado, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const paginatedAssets = filteredAssets.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const operatingAssets = assets.filter(
    (asset) => asset.estado === "Operando",
  ).length;
  const otherStatuses = assets.length - operatingAssets;
  const highCriticality = assets.filter(
    (asset) => asset.criticidad === "Alta",
  ).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">
            Google Sheets
          </Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                Activos
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Gestión profesional de activos con datos reales consultados
                mediante NEXT_PUBLIC_API_URL y accion=activos.
              </p>
            </div>
            <Boxes className="h-14 w-14 text-primary" />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Indicator label="Total" value={assets.length} />
          <Indicator label="Operando" value={operatingAssets} />
          <Indicator label="Otros estados" value={otherStatuses} />
          <Indicator
            label="Criticidad Alta"
            value={highCriticality}
            tone="danger"
          />
        </div>

        <Card className="mt-6 bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Inventario de activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-primary"
                  placeholder="Buscar por código o nombre"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <FilterSelect
                label="Todas las áreas"
                value={area}
                options={uniqueOptions(assets, "area")}
                onChange={setArea}
              />
              <FilterSelect
                label="Todos los estados"
                value={estado}
                options={uniqueOptions(assets, "estado")}
                onChange={setEstado}
              />
              <FilterSelect
                label="Toda criticidad"
                value={criticidad}
                options={uniqueOptions(assets, "criticidad")}
                onChange={setCriticidad}
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              {isLoading ? (
                <StateMessage
                  title="Cargando activos"
                  detail="Consultando Google Sheets..."
                />
              ) : error ? (
                <StateMessage
                  title="Error al cargar"
                  detail={error}
                  icon={<AlertCircle className="h-6 w-6 text-red-300" />}
                />
              ) : filteredAssets.length === 0 ? (
                <StateMessage
                  title="Sin activos"
                  detail="No hay registros para los filtros seleccionados."
                />
              ) : (
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-950/80 text-muted-foreground">
                    <tr>
                      {[
                        "Código",
                        "Nombre",
                        "Tipo",
                        "Área",
                        "Marca",
                        "Estado",
                        "Criticidad",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedAssets.map((asset, index) => (
                      <tr
                        key={`${asset.codigo}-${index}`}
                        className="bg-slate-950/40 transition hover:bg-white/[0.06]"
                      >
                        <td className="px-4 py-3 font-semibold text-primary">
                          {asset.codigo || "—"}
                        </td>
                        <td className="px-4 py-3">{asset.nombre || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {asset.tipo || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {asset.area || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {asset.marca || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-primary/15 text-primary">
                            {asset.estado || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              asset.criticidad === "Alta"
                                ? "bg-red-500/20 text-red-200"
                                : "bg-white/10 text-muted-foreground"
                            }
                          >
                            {asset.criticidad || "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando {paginatedAssets.length} de {filteredAssets.length}{" "}
                activos filtrados
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-xl border border-white/10 px-4 py-2 disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <span className="rounded-xl bg-slate-950/70 px-4 py-2">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="rounded-xl border border-white/10 px-4 py-2 disabled:opacity-40"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Indicator({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="bg-white/[0.04]">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={
            tone === "danger"
              ? "mt-2 text-4xl font-black text-red-200"
              : "mt-2 text-4xl font-black"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm outline-none transition focus:border-primary"
      value={value}
      onChange={(event) => onChange(event.target.value)}
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

function StateMessage({
  title,
  detail,
  icon,
}: {
  title: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 bg-slate-950/40 p-8 text-center">
      {icon ?? <Boxes className="h-6 w-6 text-primary" />}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
