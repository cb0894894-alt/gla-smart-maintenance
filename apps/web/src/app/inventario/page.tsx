"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, Loader2, Package, Search } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchInventory,
  filterInventoryItems,
  getInventoryIndicators,
  type InventoryItem,
} from "@/lib/inventory/google-sheets";

const PAGE_SIZE = 25;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);

  async function loadInventory() {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchInventory());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar el inventario real.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, categoria, estado]);

  const filtered = useMemo(
    () => filterInventoryItems(items, { search, categoria, estado }),
    [items, search, categoria, estado],
  );
  const indicators = useMemo(() => getInventoryIndicators(items), [items]);
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.categoria).filter(Boolean))).sort(),
    [items],
  );
  const statuses = useMemo(
    () => Array.from(new Set(items.map((item) => item.estado).filter(Boolean))).sort(),
    [items],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="flex-1 p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">Alpha 0.1 MCA</Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Inventario de refacciones</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Consulta refacciones reales desde INV_Refacciones, detecta stock bajo y monitorea el valor del inventario.
              </p>
            </div>
            <Package className="h-14 w-14 text-primary" />
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <button
              className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
              onClick={() => void loadInventory()}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total de refacciones", indicators.total],
            ["Existencias bajas", indicators.bajas],
            ["Agotadas", indicators.agotadas],
            ["Valor del inventario", `$${indicators.valorInventario.toLocaleString("es-MX")}`],
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
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  className="field pl-9"
                  placeholder="Buscar refacción o código"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Select
                value={categoria}
                onChange={setCategoria}
                label="Todas las categorías"
                options={categories}
              />
              <Select
                value={estado}
                onChange={setEstado}
                label="Todos los estados"
                options={statuses}
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-white/10 text-muted-foreground">
                  <tr>
                    {[
                      "Código",
                      "Refacción",
                      "Categoría",
                      "Existencia",
                      "Stock mínimo",
                      "Unidad",
                      "Ubicación",
                      "Proveedor",
                      "Costo unitario",
                      "Estado",
                      "Última actualización",
                    ].map((header) => (
                      <th key={header} className="px-4 py-3 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        Cargando inventario real...
                      </td>
                    </tr>
                  ) : pageItems.length ? (
                    pageItems.map((item) => {
                      const lowStock = item.existencia <= item.stockMinimo;
                      return (
                        <tr key={item.codigo} className={`border-t border-white/10 ${lowStock ? "bg-amber-500/10" : ""}`}>
                          <td className="px-4 py-3 font-semibold text-primary">{item.codigo}</td>
                          <td className="px-4 py-3">{item.refaccion}</td>
                          <td className="px-4 py-3">{item.categoria}</td>
                          <td className="px-4 py-3">{item.existencia}</td>
                          <td className="px-4 py-3">{item.stockMinimo}</td>
                          <td className="px-4 py-3">{item.unidad}</td>
                          <td className="px-4 py-3">{item.ubicacion}</td>
                          <td className="px-4 py-3">{item.proveedor}</td>
                          <td className="px-4 py-3">{item.costoUnitario}</td>
                          <td className="px-4 py-3">
                            <Badge className={lowStock ? "bg-amber-500/15 text-amber-200" : "bg-primary/15 text-primary"}>
                              {item.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{formatDate(item.ultimaActualizacion)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                        <p>No hay refacciones para los filtros seleccionados.</p>
                        <button
                          className="mt-3 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10"
                          onClick={() => void loadInventory()}
                        >
                          Reintentar
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {pageItems.length} de {filtered.length} registros · página {page} de {totalPages}
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
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
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
    <div className={`mt-3 flex items-center gap-2 rounded-2xl border p-3 text-sm ${tone === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}>
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
