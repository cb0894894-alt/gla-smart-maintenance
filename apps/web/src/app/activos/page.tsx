"use client";

import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, ChevronDown, ChevronRight, Download, History, Link2, Pencil, Plus, Printer, QrCode, Search, Truck, Wrench, X } from "lucide-react";
import QRCode from "qrcode";
import Image from "next/image";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth/client";
import {
  createAsset, fetchAssetMovements, fetchAssets, matchesAssetSearch, transferAsset, updateAsset, validateAsset,
  type Asset, type AssetMovement, type AssetMutationInput, type AssetTransferInput,
} from "@/lib/assets/google-sheets";
import { convertAssetToComponent, createComponent, fetchComponents, validateComponent, type AssetComponent, type ComponentInput } from "@/lib/assets/components";
import { fetchAreas, fetchBranches, type Area, type Branch } from "@/lib/catalogs/branches";

const PAGE_SIZE = 25;
const EMPTY_ASSET: AssetMutationInput = {
  codigo: "", nombre: "", tipo: "", sucursal: "", area: "", ubicacion: "",
  marca: "", modelo: "", estado: "Operando", criticidad: "Media", motivo: "Alta inicial", responsable: "",
  sucursalPropietaria: "", tipoTraslado: "", fechaRetornoPrevista: "",
};

function uniqueOptions(assets: Asset[], field: keyof Asset) {
  return Array.from(new Set(assets.map((asset) => asset[field]).filter((value): value is string => Boolean(value)))).sort();
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMovementDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Chihuahua", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function formatReturnDate(value?: string) {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export default function AssetsPage() {
  const { user, permissions } = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalogAreas, setCatalogAreas] = useState<Area[]>([]);
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
  const [components, setComponents] = useState<AssetComponent[]>([]);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [componentParent, setComponentParent] = useState<Asset | null>(null);
  const [migratingAsset, setMigratingAsset] = useState<Asset | null>(null);
  const [transferringAsset, setTransferringAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [showIntegrated, setShowIntegrated] = useState(false);
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

  useEffect(() => { fetchComponents().then(setComponents).catch(() => setComponents([])); }, []);
  useEffect(() => {
    Promise.all([fetchBranches(), fetchAreas()]).then(([loadedBranches, loadedAreas]) => {
      setBranches(loadedBranches.filter((branch) => branch.estado !== "Inactiva"));
      setCatalogAreas(loadedAreas.filter((catalogArea) => catalogArea.estado !== "Inactiva"));
    }).catch(() => setError("No se pudieron cargar las sucursales y áreas."));
  }, []);

  useEffect(() => {
    const requestedAsset = new URLSearchParams(window.location.search).get("buscar");
    if (requestedAsset) setSearch(requestedAsset);
  }, []);

  useEffect(() => setPage(1), [search, sucursal, area, estado, criticidad]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) =>
      matchesAssetSearch(asset, search) &&
      (showIntegrated || asset.estado !== "Integrado como componente") &&
      (!sucursal || asset.sucursal === sucursal) && (!area || asset.area === area) &&
      (!estado || asset.estado === estado) && (!criticidad || asset.criticidad === criticidad));
  }, [area, assets, criticidad, estado, search, showIntegrated, sucursal]);

  const selectableAreas = useMemo(() => {
    const combined = [...catalogAreas];
    const seen = new Set(combined.map((item) => `${item.idSucursal.toLocaleLowerCase()}::${item.nombre.trim().toLocaleLowerCase()}`));
    assets.forEach((asset) => {
      if (!asset.sucursal.trim() || !asset.area.trim()) return;
      const branch = branches.find((item) => item.nombre.trim().toLocaleLowerCase() === asset.sucursal.trim().toLocaleLowerCase());
      if (!branch) return;
      const key = `${branch.idSucursal.toLocaleLowerCase()}::${asset.area.trim().toLocaleLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      combined.push({ idArea: `existing-${branch.idSucursal}-${asset.area}`, idSucursal: branch.idSucursal, nombre: asset.area.trim(), estado: "Activa" });
    });
    return combined.sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));
  }, [assets, branches, catalogAreas]);

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
    const selectedBranch = branches.find((branch) => branch.nombre === editing.sucursal);
    if (!selectedBranch) return setFormError("Selecciona una sucursal del catálogo.");
    if (!selectableAreas.some((catalogArea) => catalogArea.idSucursal === selectedBranch.idSucursal && catalogArea.nombre === editing.area)) return setFormError("Selecciona un área perteneciente a la sucursal.");
    const errors = validateAsset(editing, !isNew);
    if (Object.keys(errors).length) return setFormError(Object.values(errors)[0] || "Revisa los datos.");
    setSaving(true); setFormError(null);
    try {
      if (isNew) {
        const result = await createAsset(editing);
        const loaded = await fetchAssets();
        setAssets(loaded);
        const created = loaded.find((asset) => asset.codigo === result.codigo);
        setEditing(null);
        if (created) setQrAsset(created);
      } else {
        await updateAsset(editing);
        await reloadAssets();
        setEditing(null);
      }
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  }
  async function showHistory(asset: Asset) {
    setMovementAsset(asset); setMovements(null);
    try { setMovements(await fetchAssetMovements(asset.codigo)); } catch { setMovements([]); }
  }
  async function componentCreated() {
    setComponents(await fetchComponents());
    setComponentParent(null);
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
            <label className="text-sm"><span className="mb-1 block font-medium text-muted-foreground">Buscar activos</span><span className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="field pl-10" placeholder="Ej. MCA peladora Johnson" value={search} onChange={(e) => setSearch(e.target.value)} /></span></label>
            <Filter title="Sucursal" label="Todas las sucursales" value={sucursal} options={uniqueOptions(assets, "sucursal")} onChange={setSucursal} />
            <Filter title="Área" label="Todas las áreas" value={area} options={uniqueOptions(assets, "area")} onChange={setArea} />
            <Filter title="Estado" label="Todos los estados" value={estado} options={uniqueOptions(assets, "estado")} onChange={setEstado} />
            <Filter title="Criticidad" label="Toda criticidad" value={criticidad} options={uniqueOptions(assets, "criticidad")} onChange={setCriticidad} />
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showIntegrated} onChange={(event) => setShowIntegrated(event.target.checked)} className="h-4 w-4 accent-teal-400" />Mostrar activos ya integrados como componentes</label>
          <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-white/10">
            {isLoading ? <State title="Cargando activos" detail="Consultando Google Sheets..." /> : error ? <State title="Error al cargar" detail={error} error /> : filteredAssets.length === 0 ? <State title="Sin activos" detail="No hay registros para los filtros seleccionados." /> :
              <table className="w-full min-w-[1300px] text-left text-sm"><thead className="bg-slate-950/80 text-muted-foreground"><tr>{["Código","Nombre","Tipo","Sucursal","Área","Ubicación","Marca","Modelo","Estado","Criticidad","Acciones"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/10">{paginatedAssets.map((asset, index) => { const children = components.filter((component) => component.codigoActivo === asset.codigo); const expanded = expandedAsset === asset.codigo; return <Fragment key={`${asset.codigo}-${index}`}><tr className="bg-slate-950/40 hover:bg-white/[0.06]">
                <td className="px-4 py-3 font-semibold text-primary"><button className="flex items-center gap-2" onClick={() => setExpandedAsset(expanded ? null : asset.codigo)}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{asset.codigo || "—"}<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">{children.length}</span></button></td><td className="px-4 py-3">{asset.nombre || "—"}</td><td className="px-4 py-3 text-muted-foreground">{asset.tipo || "—"}</td>
                <td className="px-4 py-3"><span>{asset.sucursal || "—"}</span>{asset.tipoTraslado === "Temporal" ? <span className="mt-1 block text-xs text-amber-200">Temporal · pertenece a {asset.sucursalPropietaria}</span> : null}</td><td className="px-4 py-3">{asset.area || "—"}</td><td className="px-4 py-3">{asset.ubicacion || "—"}</td><td className="px-4 py-3">{asset.marca || "—"}</td><td className="px-4 py-3">{asset.modelo || "—"}</td>
                <td className="px-4 py-3"><Badge className={asset.estado === "Baja" ? "bg-red-500/20 text-red-200" : "bg-primary/15 text-primary"}>{asset.estado || "—"}</Badge></td><td className="px-4 py-3">{asset.criticidad || "—"}</td>
                <td className="px-4 py-3"><div className="flex gap-2"><IconButton title="Código QR" onClick={() => setQrAsset(asset)} icon={<QrCode className="h-4 w-4" />} />{canWrite ? <IconButton title={asset.tipoTraslado === "Temporal" ? "Gestionar traslado temporal" : "Trasladar equipo"} onClick={() => setTransferringAsset(asset)} icon={<Truck className="h-4 w-4" />} /> : null}{canWrite ? <IconButton title="Agregar componente" onClick={() => setComponentParent(asset)} icon={<Wrench className="h-4 w-4" />} /> : null}{canWrite && asset.estado !== "Integrado como componente" ? <IconButton title="Integrar dentro de otro equipo" onClick={() => setMigratingAsset(asset)} icon={<Link2 className="h-4 w-4" />} /> : null}{canWrite ? <IconButton title="Editar" onClick={() => openEdit(asset)} icon={<Pencil className="h-4 w-4" />} /> : null}<IconButton title="Historial" onClick={() => showHistory(asset)} icon={<History className="h-4 w-4" />} /></div></td>
              </tr>{expanded ? <tr className="bg-cyan-950/20"><td colSpan={11} className="p-4"><ComponentList components={children} onAdd={canWrite ? () => setComponentParent(asset) : undefined} /></td></tr> : null}</Fragment>})}</tbody></table>}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Mostrando {paginatedAssets.length} de {filteredAssets.length}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="nav-button">Anterior</button><span className="px-3 py-2">Página {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="nav-button">Siguiente</button></div></div>
        </CardContent></Card>
        {editing ? <AssetEditor value={editing} isNew={isNew} saving={saving} error={formError} branches={branches} areas={selectableAreas} onChange={setEditing} onClose={() => setEditing(null)} onSubmit={saveAsset} /> : null}
        {movementAsset ? <MovementHistory asset={movementAsset} movements={movements} onClose={() => setMovementAsset(null)} /> : null}
        {componentParent ? <ComponentEditor asset={componentParent} onClose={() => setComponentParent(null)} onSaved={componentCreated} /> : null}
        {migratingAsset ? <MigrationEditor source={migratingAsset} assets={assets} userIdentity={user?.email || user?.name || ""} onClose={() => setMigratingAsset(null)} onSaved={async () => { await Promise.all([reloadAssets(), fetchComponents().then(setComponents)]); setMigratingAsset(null); }} /> : null}
        {transferringAsset ? <TransferEditor asset={transferringAsset} branches={branches} areas={selectableAreas} componentCount={components.filter((component) => component.codigoActivo === transferringAsset.codigo).length} userIdentity={user?.email || user?.name || ""} onClose={() => setTransferringAsset(null)} onSaved={async () => { await reloadAssets(); setTransferringAsset(null); }} /> : null}
        {qrAsset ? <AssetQrLabel asset={qrAsset} onClose={() => setQrAsset(null)} /> : null}
      </section>
    </main>
  );
}

function AssetEditor({ value, isNew, saving, error, branches, areas, onChange, onClose, onSubmit }: { value: AssetMutationInput; isNew: boolean; saving: boolean; error: string | null; branches: Branch[]; areas: Area[]; onChange: (v: AssetMutationInput) => void; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) {
  const set = (field: keyof AssetMutationInput, next: string) => onChange({ ...value, [field]: next });
  const selectedBranch = branches.find((branch) => branch.nombre === value.sucursal);
  const areaOptions = areas.filter((area) => area.idSucursal === selectedBranch?.idSucursal);
  const changeBranch = (next: string) => onChange({ ...value, sucursal: next, area: "" });
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><form onSubmit={onSubmit} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
    <div className="mb-6 flex items-center justify-between"><div><h3 className="text-2xl font-bold">{isNew ? "Nueva maquinaria" : `Editar ${value.codigo}`}</h3><p className="text-sm text-muted-foreground">Los traslados y cambios de estado quedarán en el historial.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Código<input disabled className="field mt-1" value={isNew ? "Se genera automáticamente al guardar" : value.codigo} /></label>
      {([['nombre','Nombre'],['tipo','Tipo'],['marca','Marca'],['modelo','Modelo']] as [keyof AssetMutationInput,string][]).map(([field,label]) => <label key={field} className="text-sm">{label}<input className="field mt-1" value={value[field]} onChange={(e) => set(field,e.target.value)} /></label>)}
      <label className="text-sm">Sucursal<select className="field mt-1" value={value.sucursal} onChange={(e) => changeBranch(e.target.value)}><option value="">Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.idSucursal || branch.codigo} value={branch.nombre}>{branch.nombre}</option>)}</select></label>
      <label className="text-sm">Área<select className="field mt-1" disabled={!selectedBranch} value={value.area} onChange={(e) => set("area",e.target.value)}><option value="">{selectedBranch ? "Selecciona un área" : "Primero selecciona la sucursal"}</option>{areaOptions.map((area) => <option key={area.idArea || area.nombre} value={area.nombre}>{area.nombre}</option>)}</select></label>
      <label className="text-sm">Ubicación<input className="field mt-1" value={value.ubicacion} onChange={(e) => set("ubicacion",e.target.value)} /></label>
      <label className="text-sm">Estado<select className="field mt-1" value={value.estado} onChange={(e) => set('estado',e.target.value)}>{["Operando","Detenida","En mantenimiento","Fuera de servicio","Baja"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="text-sm">Criticidad<select className="field mt-1" value={value.criticidad} onChange={(e) => set('criticidad',e.target.value)}>{["Baja","Media","Alta","Crítica"].map(x => <option key={x}>{x}</option>)}</select></label>
      {!isNew ? <label className="text-sm sm:col-span-2">Motivo del cambio<input className="field mt-1" placeholder="Traslado, baja, reactivación..." value={value.motivo} onChange={(e) => set('motivo',e.target.value)} /></label> : null}
    </div>{error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button></div>
  </form></div>;
}

function MovementHistory({ asset, movements, onClose }: { asset: Asset; movements: AssetMovement[] | null; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><div className="mx-auto mt-8 max-w-5xl rounded-3xl border border-white/10 bg-slate-900 p-6"><div className="flex justify-between"><div><h3 className="text-2xl font-bold">Historial · {asset.nombre}</h3><p className="text-muted-foreground">{asset.codigo}</p></div><button onClick={onClose}><X /></button></div>
    <div className="mt-6 overflow-x-auto">{movements === null ? <p>Cargando historial...</p> : movements.length === 0 ? <p className="text-muted-foreground">No hay movimientos registrados todavía.</p> : <table className="w-full min-w-[1350px] table-fixed text-sm"><thead><tr>{["Fecha","Movimiento","Sucursal","Área","Ubicación","Estado","Retorno previsto","Motivo","Responsable"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{movements.map((m) => <tr key={m.idMovimiento} className="border-t border-white/10 align-top"><td className="px-3 py-3 whitespace-nowrap">{formatMovementDate(m.fecha)}</td><td className="px-3 py-3">{m.tipoMovimiento || "Actualización"}</td><td className="px-3 py-3">{m.sucursalAnterior || "—"} → {m.sucursalNueva}</td><td className="px-3 py-3">{m.areaAnterior || "—"} → {m.areaNueva}</td><td className="px-3 py-3">{m.ubicacionAnterior || "—"} → {m.ubicacionNueva}</td><td className="px-3 py-3">{m.estadoAnterior || "—"} → {m.estadoNuevo}</td><td className="px-3 py-3 whitespace-nowrap">{formatReturnDate(m.fechaRetornoPrevista)}</td><td className="px-3 py-3 break-words">{m.motivo || "—"}</td><td className="px-3 py-3 break-all">{m.responsable || "—"}</td></tr>)}</tbody></table>}</div>
  </div></div>;
}

function AssetQrLabel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const runtimeBaseUrl = typeof window === "undefined" ? "" : window.location.origin;
  const qrBaseUrl = configuredBaseUrl || runtimeBaseUrl;
  const assetUrl = `${qrBaseUrl}/activos?buscar=${encodeURIComponent(asset.codigo)}`;
  const isLocalAddress = !configuredBaseUrl && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  useEffect(() => {
    if (isLocalAddress) {
      setError("El sistema aún está en localhost. Publica la aplicación y configura NEXT_PUBLIC_APP_URL antes de imprimir etiquetas para celular.");
      return;
    }
    QRCode.toDataURL(assetUrl, { width: 420, margin: 2, errorCorrectionLevel: "M", color: { dark: "#07111f", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setError("No se pudo generar el código QR."));
  }, [assetUrl, isLocalAddress]);
  function download() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${asset.codigo}.png`;
    link.click();
  }
  function print() {
    if (!qrDataUrl) return;
    const popup = window.open("", "_blank", "width=640,height=760");
    if (!popup) return setError("Permite ventanas emergentes para imprimir la etiqueta.");
    popup.document.write(`<!doctype html><html><head><title>${asset.codigo}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:24px}.label{width:360px;border:2px solid #07111f;border-radius:16px;padding:22px;text-align:center}.brand{font-size:13px;font-weight:700;letter-spacing:.08em}.name{font-size:22px;font-weight:800;margin:12px 0 2px}.code{font-size:18px;font-weight:700}.meta{font-size:13px;margin-top:8px}.qr{width:280px;height:280px;margin:12px auto 4px}@media print{body{padding:0}.label{break-inside:avoid}}</style></head><body><div class="label"><div class="brand">GLA SMART MAINTENANCE</div><div class="name">${escapeHtml(asset.nombre)}</div><div class="code">${escapeHtml(asset.codigo)}</div><img class="qr" src="${qrDataUrl}"/><div class="meta">${escapeHtml(asset.sucursal)} · ${escapeHtml(asset.area)} · ${escapeHtml(asset.ubicacion)}</div></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    popup.document.close();
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><div className="mx-auto mt-8 max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-2xl font-bold">Etiqueta QR</h3><p className="text-sm text-muted-foreground">{asset.nombre} · {asset.codigo}</p></div><button type="button" onClick={onClose}><X /></button></div><div className="mx-auto mt-6 max-w-sm rounded-3xl bg-white p-6 text-center text-slate-950"><p className="text-xs font-black tracking-widest">GLA SMART MAINTENANCE</p><p className="mt-3 text-xl font-black">{asset.nombre}</p><p className="font-bold">{asset.codigo}</p>{qrDataUrl ? <Image unoptimized width={256} height={256} src={qrDataUrl} alt={`QR de ${asset.codigo}`} className="mx-auto mt-3 h-64 w-64" /> : <div className="mx-auto mt-3 flex h-64 w-64 items-center justify-center bg-slate-100 p-6 text-sm">{isLocalAddress ? "QR pendiente de publicación" : "Generando QR..."}</div>}<p className="mt-2 text-xs">{asset.sucursal} · {asset.area} · {asset.ubicacion}</p></div>{error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<p className="mt-4 break-all text-xs text-muted-foreground">Destino protegido: {assetUrl}</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cerrar</button><button type="button" disabled={!qrDataUrl} onClick={download} className="nav-button inline-flex items-center gap-2"><Download className="h-4 w-4" />Descargar PNG</button><button type="button" disabled={!qrDataUrl} onClick={print} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50"><Printer className="h-4 w-4" />Imprimir etiqueta</button></div></div></div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function TransferEditor({ asset, branches, areas, componentCount, userIdentity, onClose, onSaved }: { asset: Asset; branches: Branch[]; areas: Area[]; componentCount: number; userIdentity: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const isTemporarilyTransferred = asset.tipoTraslado === "Temporal";
  const [value, setValue] = useState<AssetTransferInput>({
    codigo: asset.codigo,
    tipoTraslado: isTemporarilyTransferred ? "Retorno" : "Temporal",
    sucursalDestino: isTemporarilyTransferred ? (asset.sucursalPropietaria || asset.sucursal) : "",
    areaDestino: "",
    ubicacionDestino: "",
    fechaRetornoPrevista: "",
    motivo: isTemporarilyTransferred ? "Retorno a sucursal propietaria" : "",
    responsable: userIdentity,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const earliestReturnDate = localDateValue(tomorrow);
  const selectedBranch = branches.find((branch) => branch.nombre === value.sucursalDestino);
  const areaOptions = areas.filter((area) => area.idSucursal === selectedBranch?.idSucursal);
  const set = (field: keyof AssetTransferInput, next: string) => setValue((current) => ({ ...current, [field]: next }));
  const changeBranch = (next: string) => setValue((current) => ({ ...current, sucursalDestino: next, areaDestino: "" }));
  function changeType(next: AssetTransferInput["tipoTraslado"]) {
    setValue((current) => ({ ...current, tipoTraslado: next, sucursalDestino: next === "Retorno" ? (asset.sucursalPropietaria || asset.sucursal) : "", areaDestino: "", fechaRetornoPrevista: next === "Temporal" ? current.fechaRetornoPrevista : "", motivo: next === "Retorno" ? "Retorno a sucursal propietaria" : "" }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value.sucursalDestino.trim()) return setError("Selecciona o captura la sucursal de destino.");
    if (!selectedBranch) return setError("Selecciona una sucursal del catálogo.");
    if (value.sucursalDestino.trim() === asset.sucursal.trim()) return setError("La sucursal de destino debe ser diferente de la ubicación actual.");
    if (!value.areaDestino.trim()) return setError("Captura el área de destino.");
    if (!areaOptions.some((area) => area.nombre === value.areaDestino)) return setError("Selecciona un área perteneciente a la sucursal de destino.");
    if (!value.ubicacionDestino.trim()) return setError("Captura la ubicación de destino.");
    if (value.tipoTraslado === "Temporal" && !value.fechaRetornoPrevista) return setError("Selecciona la fecha prevista de retorno.");
    if (value.tipoTraslado === "Temporal" && value.fechaRetornoPrevista <= localDateValue()) return setError("La fecha prevista de retorno debe ser posterior a hoy.");
    if (!value.motivo.trim()) return setError("Captura el motivo del traslado.");
    setSaving(true); setError(null);
    try { await transferAsset(value); await onSaved(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo trasladar el equipo."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><form onSubmit={submit} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
    <div className="flex items-start justify-between"><div><h3 className="text-2xl font-bold">Trasladar equipo</h3><p className="text-sm text-muted-foreground">{asset.nombre} · {asset.codigo}</p></div><button type="button" onClick={onClose}><X /></button></div>
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm"><p>Ubicación actual: <strong>{asset.sucursal} · {asset.area} · {asset.ubicacion}</strong></p><p className="mt-1">Sucursal propietaria: <strong>{asset.sucursalPropietaria || asset.sucursal}</strong></p><p className="mt-1 text-muted-foreground">El equipo conserva su código y sus {componentCount} componente{componentCount === 1 ? "" : "s"} lo acompañan automáticamente.</p></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm sm:col-span-2">Tipo de traslado<select className="field mt-1" value={value.tipoTraslado} onChange={(event) => changeType(event.target.value as AssetTransferInput["tipoTraslado"])}>{isTemporarilyTransferred ? <option value="Retorno">Regresar a sucursal propietaria</option> : null}<option value="Temporal">Temporal</option><option value="Definitivo">Definitivo</option></select></label>
      <label className="text-sm">Sucursal destino<select className="field mt-1" disabled={value.tipoTraslado === "Retorno"} value={value.sucursalDestino} onChange={(event) => changeBranch(event.target.value)}><option value="">Selecciona una sucursal</option>{branches.map((branch) => <option key={branch.idSucursal || branch.codigo} value={branch.nombre}>{branch.nombre}</option>)}</select></label>
      <label className="text-sm">Área destino<select className="field mt-1" disabled={!selectedBranch} value={value.areaDestino} onChange={(event) => set("areaDestino", event.target.value)}><option value="">{selectedBranch ? "Selecciona un área" : "Primero selecciona la sucursal"}</option>{areaOptions.map((area) => <option key={area.idArea || area.nombre} value={area.nombre}>{area.nombre}</option>)}</select></label>
      <label className="text-sm sm:col-span-2">Ubicación destino<input className="field mt-1" value={value.ubicacionDestino} onChange={(event) => set("ubicacionDestino", event.target.value)} /></label>
      {value.tipoTraslado === "Temporal" ? <label className="text-sm">Retorno previsto<input type="date" min={earliestReturnDate} className="field mt-1" value={value.fechaRetornoPrevista} onChange={(event) => set("fechaRetornoPrevista", event.target.value)} /></label> : null}
      <label className={`text-sm ${value.tipoTraslado === "Temporal" ? "" : "sm:col-span-2"}`}>Motivo<input className="field mt-1" value={value.motivo} onChange={(event) => set("motivo", event.target.value)} /></label>
    </div>
    {value.tipoTraslado === "Definitivo" ? <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100">El traslado definitivo cambiará tanto la sucursal propietaria como la ubicación actual.</p> : null}
    {error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Trasladando..." : value.tipoTraslado === "Retorno" ? "Confirmar retorno" : "Confirmar traslado"}</button></div>
  </form></div>;
}

function ComponentList({ components, onAdd }: { components: AssetComponent[]; onAdd?: () => void }) {
  if (components.length === 0) return <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Este equipo todavía no tiene componentes relacionados.</p>{onAdd ? <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-3 py-2 text-sm text-primary"><Plus className="h-4 w-4" />Agregar componente</button> : null}</div>;
  return <div><p className="mb-3 font-semibold">Componentes del equipo</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{components.map((component) => <div key={component.idComponente || component.codigoComponente} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-start justify-between"><div><p className="font-semibold">{component.nombre}</p><p className="text-xs text-primary">{component.codigoComponente}</p></div><Badge className="bg-primary/15 text-primary">{component.estado}</Badge></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><div><dt>Tipo</dt><dd className="text-white">{component.tipo || "—"}</dd></div><div><dt>Ubicación</dt><dd className="text-white">{component.ubicacion || "—"}</dd></div><div><dt>Marca</dt><dd className="text-white">{component.marca || "—"}</dd></div><div><dt>Modelo</dt><dd className="text-white">{component.modelo || "—"}</dd></div><div className="col-span-2"><dt>Serie</dt><dd className="text-white">{component.numeroSerie || "—"}</dd></div></dl></div>)}</div></div>;
}

function ComponentEditor({ asset, onClose, onSaved }: { asset: Asset; onClose: () => void; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState<ComponentInput>({ codigoActivo: asset.codigo, nombre: "", tipo: "", marca: "", modelo: "", numeroSerie: "", ubicacion: "", estado: "Operando", fechaInstalacion: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof ComponentInput, next: string) => setValue((current) => ({ ...current, [field]: next }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateComponent(value);
    if (validation) return setError(validation);
    setSaving(true); setError(null);
    try { await createComponent(value); await onSaved(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><form onSubmit={submit} className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6"><div className="flex items-start justify-between"><div><h3 className="text-2xl font-bold">Nuevo componente</h3><p className="text-sm text-muted-foreground">Equipo principal: {asset.nombre} · {asset.codigo}</p></div><button type="button" onClick={onClose}><X /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{([['nombre','Nombre'],['tipo','Tipo'],['marca','Marca'],['modelo','Modelo'],['numeroSerie','Número de serie'],['ubicacion','Ubicación dentro del equipo'],['fechaInstalacion','Fecha de instalación']] as [keyof ComponentInput,string][]).map(([field,label]) => <label key={field} className="text-sm">{label}<input type={field === 'fechaInstalacion' ? 'date' : 'text'} className="field mt-1" value={value[field]} onChange={(event) => set(field,event.target.value)} /></label>)}<label className="text-sm">Estado<select className="field mt-1" value={value.estado} onChange={(event) => set('estado',event.target.value)}>{["Operando","Detenido","En mantenimiento","Fuera de servicio","Baja"].map((option) => <option key={option}>{option}</option>)}</select></label></div>{error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Guardando..." : "Guardar componente"}</button></div></form></div>;
}

function MigrationEditor({ source, assets, userIdentity, onClose, onSaved }: { source: Asset; assets: Asset[]; userIdentity: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [parentCode, setParentCode] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [location, setLocation] = useState(source.ubicacion || "Dentro del equipo");
  const [reason, setReason] = useState("Reorganización como componente del equipo principal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidates = assets.filter((asset) => asset.codigo !== source.codigo && asset.estado !== "Integrado como componente").sort((a, b) => a.nombre.localeCompare(b.nombre));
  const matchingCandidates = parentCode ? [] : candidates.filter((asset) => matchesAssetSearch(asset, parentSearch)).slice(0, 8);
  const selectedParent = candidates.find((asset) => asset.codigo === parentCode);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!parentCode) return setError("Selecciona el equipo principal.");
    if (!location.trim()) return setError("Captura la ubicación dentro del equipo.");
    if (!reason.trim()) return setError("Captura el motivo.");
    setSaving(true); setError(null);
    try { await convertAssetToComponent({ codigoOrigen: source.codigo, codigoActivoPadre: parentCode, ubicacion: location, motivo: reason, responsable: userIdentity }); await onSaved(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo completar la migración."); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur"><form onSubmit={submit} className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6"><div className="flex items-start justify-between"><div><h3 className="text-2xl font-bold">Integrar como componente</h3><p className="text-sm text-muted-foreground">{source.nombre} · {source.codigo}</p></div><button type="button" onClick={onClose}><X /></button></div><div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">El registro original no se eliminará. Quedará oculto de la lista principal y conservará sus órdenes e historial.</div><div className="mt-5 grid gap-4"><div><label className="text-sm">Buscar equipo principal<input className="field mt-1" placeholder="Ej. MCA peladora PE008" value={parentSearch} onChange={(event) => { setParentSearch(event.target.value); setParentCode(""); }} /></label>{parentSearch.trim() && !selectedParent ? <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-2">{matchingCandidates.length ? matchingCandidates.map((asset) => <button type="button" key={asset.codigo} onClick={() => { setParentCode(asset.codigo); setParentSearch(`${asset.codigo} · ${asset.nombre}`); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/15 hover:text-primary"><span className="font-semibold">{asset.codigo} · {asset.nombre}</span><span className="block text-xs text-muted-foreground">{asset.sucursal} · {asset.area} · {asset.ubicacion}</span></button>) : <p className="p-3 text-sm text-muted-foreground">No se encontraron equipos.</p>}</div> : null}{selectedParent ? <p className="mt-2 rounded-xl bg-primary/15 p-3 text-sm text-primary">Seleccionado: {selectedParent.codigo} · {selectedParent.nombre}</p> : null}</div><label className="text-sm">Ubicación dentro del equipo<input className="field mt-1" value={location} onChange={(event) => setLocation(event.target.value)} /></label><label className="text-sm">Motivo<input className="field mt-1" value={reason} onChange={(event) => setReason(event.target.value)} /></label></div>{error ? <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-red-200">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="nav-button">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Integrando..." : "Confirmar integración"}</button></div></form></div>;
}

function Filter({ title, label, value, options, onChange }: { title: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) { return <label className="text-sm"><span className="mb-1 block font-medium text-muted-foreground">{title}</span><select className="field" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{label}</option>{options.map(o => <option key={o}>{o}</option>)}</select></label>; }
function Indicator({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) { return <Card className="bg-white/[0.04]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-2 text-4xl font-black ${danger ? "text-red-200" : ""}`}>{value}</p></CardContent></Card>; }
function State({ title, detail, error = false }: { title: string; detail: string; error?: boolean }) { return <div className="flex min-h-60 flex-col items-center justify-center gap-3 bg-slate-950/40 p-8 text-center">{error ? <AlertCircle className="text-red-300" /> : <Boxes className="text-primary" />}<div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{detail}</p></div></div>; }
function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) { return <button title={title} onClick={onClick} className="rounded-xl border border-white/10 p-2 hover:border-primary">{icon}</button>; }
