"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, History, Pencil, Plus, Search, X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth/client";
import {
  createAsset, fetchAssetMovements, fetchAssets, updateAsset, validateAsset,
  type Asset, type AssetMovement, type AssetMutationInput,
} from "@/lib/assets/google-sheets";

const PAGE_SIZE = 25;
const EMPTY_ASSET: AssetMutationInput = {
  codigo: "", nombre: "", tipo: "", sucursal: "", area: "", ubicacion: "",
  marca: "", modelo: "", estado: "Operando", criticidad: "Media", motivo: "Alta inicial", responsable: "",
};

function uniqueOptions(assets: Asset[], field: keyof Asset) {
  return Array.from(new Set(assets.map((asset) => asset[field]).filter(Boolean))).sort();
}

export default function AssetsPage() {
  const { user, permissions } = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [area, setArea] = useState("");
  const [estado, setEstado] = useState("");
  const [criticidad, setCriticidad] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AssetMutationInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [movementAsset, setMovementAsset] = useState<Asset | null>(null);
  const [movements, setMovements] = useState<AssetMovement[] | null>(null);
  const canWrite = user?.role === "Administrador" && permissions.includes("activos:write");

  async function reloadAssets() {
    const loaded = await fetchAssets();
    setAssets(loaded);
  }

  useEffect(() => {
    fetchAssets().then(setAssets).catch((loadError: unknown) => {
      console.error("Unable to load assets from Google Sheets.", loadError);
      setError("No se pudieron cargar los activos desde Google Sheets.");
    }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => setPage(1), [search, sucursal, area, estado, criticidad]);

  const filteredAssets = useMemo(() => {
    const text = search.trim().toLowerCase();
    return assets.filter((asset) =>
      (!text || asset.codigo.toLowerCase().includes(text) || asset.nombre.toLowerCase().includes(text)) &&
      (!sucursal || asset.sucursal === sucursal) && (!area || asset.area === area) &&
      (!estado || asset.estado === estado) && (!criticidad || asset.criticidad === criticidad));
  }, [area, assets, criticidad, estado, search, sucursal]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const paginatedAssets = filteredAssets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const operatingAssets = assets.filter((asset) => asset.estado === "Operando").length;
  const highCriticality = assets.filter((asset) => asset.criticidad === "Alta").length;

  function openCreate() {
    setIsNew(true); setFormError(null);
    setEditing({ ...EMPTY_ASSET, responsable: user?.email || user?.name || "" });
  }
  function openEdit(asset: Asset) {
    setIsNew(false); setFormError(null);
    setEditing({ ...asset, motivo: "", responsable: user?.email || user?.name || "" });
  }
  async function saveAsset(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const errors = validateAsset(editing, !isNew);
    if (Object.keys(errors).length) return setFormError(Object.values(errors)[0] || "Revisa los datos.");
    setSaving(true); setFormError(null);
    try {
      await (isNew ? createAsset(editing) : updateAsset(editing));
      await reloadAssets(); setEditing(null);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  }
  async function showHistory(asset: Asset) {
    setMovementAsset(asset); setMovements(null);
    try { setMovements(await fetchAssetMovements(asset.codigo)); } catch { setMovements([]); }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.24),_transparent_32rem)] md:flex">
      <Sidebar />
      <section className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30">
          <Badge className="mb-3 bg-primary/15 text-primary">Google Sheets</Badge>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="text-3xl font-black sm:text-5xl">Activos</h2><p className="mt-3 text-muted-foreground">Alta, ubicación, estado y trazabilidad de maquinaria.</p></div>
            <div className="flex items-center gap-3">
              {canWrite ? <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"><Plus className="h-5 w-5" />Nueva maquinaria</button> : null}
              <Boxes className="h-14 w-14 text-primary" />
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Indicator label="Total" value={assets.length} /><Indicator label="Operando" value={operatingAssets} />
          <Indicator label="Otros estados" value={assets.length - operatingAssets} /><Indicator label="Criticidad alta" value={highCriticality} danger />
        </div>

        <Card className="mt-6 min-w-0 max-w-full bg-white/[0.04]"><CardHeader><CardTitle>Inventario de activos</CardTitle></CardHeader><CardContent className="min-w-0">
          <div className="grid gap-3 lg:grid-cols-5">
            <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="field pl-10" placeholder="Código o nombre" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <Filter label="Todas las sucursales" value={sucursal} options={uniqueOptions(assets, "sucursal")} onChange={setSucursal} />
            <Filter label="Todas las áreas" value={area} options={uniqueOptions(assets, "area")} onChange={setArea} />
            <Filter label="Todos los estados" value={estado} options={uniqueOptions(assets, "estado")} onChange={setEstado} />
            <Filter label="Toda criticidad" value={criticidad} options={uniqueOptions(assets, "criticidad")} onChange={setCriticidad} />
          </div>
          <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-white/10">
            {isLoading ? <State title="Cargando activos" detail="Consultando Google Sheets..." /> : error ? <State title="Error al cargar" detail={error} error /> : filteredAssets.length === 0 ? <State title="Sin activos" detail="No hay registros para los filtros seleccionados." /> :
              <table className="w-full min-w-[1300px] text-left text-sm"><thead className="bg-slate-950/80 text-muted-foreground"><tr>{["Código","Nombre","Tipo","Sucursal","Área","Ubicación","Marca","Modelo","Estado","Criticidad","Acciones"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/10">{paginatedAssets.map((asset, index) => <tr key={`${asset.codigo}-${index}`} className="bg-slate-950/40 hover:bg-white/[0.06]">
                <td className="px-4 py-3 font-semibold text-primary">{asset.codigo || "—"}</td><td className="px-4 py-3">{asset.nombre || "—"}</td><td className="px-4 py-3 text-muted-foreground">{asset.tipo || "—"}</td>
                <td className="px-4 py-3">{asset.sucursal || "—"}</td><td className="px-4 py-3">{asset.area || "—"}</td><td className="px-4 py-3">{asset.ubicacion || "—"}</td><td className="px-4 py-3">{asset.marca || "—"}</td><td className="px-4 py-3">{asset.modelo || "—"}</td>
                <td className="px-4 py-3"><Badge className={asset.estado === "Baja" ? "bg-red-500/20 text-red-200" : "bg-primary/15 text-primary"}>{asset.estado || "—"}</Badge></td><td className="px-4 py-3">{asset.criticidad || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-2">{canWrite ? <IconButton title="Editar" onClick={() => openEdit(asset)} icon={<Pencil className="h-4 w-4" />} /> : null}<IconButton title="Historial" onClick={() => showHistory(asset)} icon={<History className="h-4 w-4" />} /></div></td>
              </tr>)}</tbody></table>}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Mostrando {paginatedAssets.length} de {filteredAssets.length}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="nav-button">Anterior</button><span className="px-3 py-2">Página {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="nav-button">Siguiente</button></div></div>
        </CardContent></Card>
        {editing ? <AssetEditor value={editing} isNew={isNew} saving={saving} error={formError} onChange={setEditing} onClose={() => setEditing(null)} onSubmit={saveAsset} /> : null}
        {movementAsset ? <MovementHistory asset={movementAsset} movements={movements} onClose={() => setMovementAsset(null)} /> : null}
      </section>
    </main>
  );
}

function AssetEditor({ value, isNew, saving, error, onChange, onClose, onSubmit }: { value: AssetMutationInput; isNew: boolean; saving: boolean; error: string | null; onChange: (v: AssetMutationInput) => void; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) {
  const set = (field: keyof AssetMutationInput, next: string) => onChange({ ...value, [field]: next });
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><form onSubmit={onSubmit} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
    <div className="mb-6 flex items-center justify-between"><div><h3 className="text-2xl font-bold">{isNew ? "Nueva maquinaria" : `Editar ${value.codigo}`}</h3><p className="text-sm text-muted-foreground">Los traslados y cambios de estado quedarán en el historial.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Código<input disabled className="field mt-1" value={isNew ? "Se genera automáticamente al guardar" : value.codigo} /></label>
      {([['nombre','Nombre'],['tipo','Tipo'],['marca','Marca'],['modelo','Modelo'],['sucursal','Sucursal'],['area','Área'],['ubicacion','Ubicación']] as [keyof AssetMutationInput,string][]).map(([field,label]) => <label key={field} className="text-sm">{label}<input className="field mt-1" value={value[field]} onChange={(e) => set(field,e.target.value)} /></label>)}
      <label className="text-sm">Estado<select className="field mt-1" value={value.estado} onChange={(e) => set('estado',e.target.value)}>{["Operando","Detenida","En mantenimiento","Fuera de servicio","Baja"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="text-sm">Criticidad<select className="field mt-1" value={value.criticidad} onChange={(e) => set('criticidad',e.target.value)}>{["Baja","Media","Alta","Crítica"].map(x => <option key={x}>{x}</option>)}</select></label>
      {!isNew ? <label className="text-sm sm:col-span-2">Motivo del cambio<input className="field mt-1" placeholder="Traslado, baja, reactivación..." value={value.motivo} onChange={(e) => set('motivo',e.target.value)} /></label> : null}
    </div>{error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button></div>
  </form></div>;
}

function MovementHistory({ asset, movements, onClose }: { asset: Asset; movements: AssetMovement[] | null; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><div className="mx-auto mt-8 max-w-5xl rounded-3xl border border-white/10 bg-slate-900 p-6"><div className="flex justify-between"><div><h3 className="text-2xl font-bold">Historial · {asset.nombre}</h3><p className="text-muted-foreground">{asset.codigo}</p></div><button onClick={onClose}><X /></button></div>
    <div className="mt-6 overflow-x-auto">{movements === null ? <p>Cargando historial...</p> : movements.length === 0 ? <p className="text-muted-foreground">No hay movimientos registrados todavía.</p> : <table className="w-full min-w-[900px] text-sm"><thead><tr>{["Fecha","Sucursal","Área","Ubicación","Estado","Motivo","Responsable"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{movements.map((m) => <tr key={m.idMovimiento} className="border-t border-white/10"><td className="px-3 py-3">{m.fecha}</td><td>{m.sucursalAnterior || "—"} → {m.sucursalNueva}</td><td>{m.areaAnterior || "—"} → {m.areaNueva}</td><td>{m.ubicacionAnterior || "—"} → {m.ubicacionNueva}</td><td>{m.estadoAnterior || "—"} → {m.estadoNuevo}</td><td>{m.motivo}</td><td>{m.responsable}</td></tr>)}</tbody></table>}</div>
  </div></div>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) { return <select className="field" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{label}</option>{options.map(o => <option key={o}>{o}</option>)}</select>; }
function Indicator({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <Card className="bg-white/[0.04]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-2 text-4xl font-black ${danger ? "text-red-200" : ""}`}>{value}</p></CardContent></Card>; }
function State({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) { return <div className="flex min-h-60 flex-col items-center justify-center gap-3 bg-slate-950/40 p-8 text-center">{error ? <AlertCircle className="text-red-300" /> : <Boxes className="text-primary" />}<div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{detail}</p></div></div>; }
function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) { return <button title={title} onClick={onClick} className="rounded-xl border border-white/10 p-2 hover:border-primary">{icon}</button>; }
