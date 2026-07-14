"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardPlus, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAssets, type Asset } from "@/lib/assets/google-sheets";
import {
  createWorkOrderFromFailure,
  EQUIPMENT_CONDITIONS,
  getAssetLabel,
  validateFailureReport,
  WORK_ORDER_PRIORITIES,
  type EquipmentCondition,
  type FailureReportInput,
  type WorkOrderPriority,
} from "@/lib/work-orders/google-sheets";

const initialForm: FailureReportInput = {
  assetCode: "",
  assetName: "",
  assetArea: "",
  assetCriticality: "",
  reporter: "",
  description: "",
  priority: "Media",
  equipmentCondition: "Operando",
  reportedAt: "",
  observations: "",
};

export default function FailureReportPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [form, setForm] = useState<FailureReportInput>(initialForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FailureReportInput, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);

  useEffect(() => {
    setForm((current) =>
      current.reportedAt
        ? current
        : { ...current, reportedAt: new Date().toISOString() },
    );
  }, []);

  useEffect(() => {
    fetchAssets()
      .then((loadedAssets) => {
        setAssets(loadedAssets);
        setAssetError(null);
      })
      .catch((error: unknown) => {
        console.error("Unable to load assets from Google Sheets.", error);
        setAssetError(
          "No se pudieron cargar los activos reales desde Google Sheets.",
        );
      })
      .finally(() => setIsLoadingAssets(false));
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.codigo === form.assetCode),
    [assets, form.assetCode],
  );

  function updateAsset(assetCode: string) {
    const asset = assets.find((item) => item.codigo === assetCode);
    setForm((current) => ({
      ...current,
      assetCode,
      assetName: asset?.nombre || "",
      assetArea: asset?.area || "",
      assetCriticality: asset?.criticidad || "",
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFolio(null);
    setSubmitError(null);

    const nextForm = { ...form, reportedAt: new Date().toISOString() };
    const nextErrors = validateFailureReport(nextForm);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await createWorkOrderFromFailure(nextForm);
      setFolio(result.folio);
      setForm({ ...initialForm, reportedAt: new Date().toISOString() });
      setErrors({});
    } catch (error) {
      console.error("Unable to create work order.", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la orden de trabajo.",
      );
    } finally {
      setIsSubmitting(false);
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
                Reporte de falla → Orden de Trabajo
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Captura fallas con activos reales de Google Sheets y genera una
                OT con estado inicial Abierta.
              </p>
            </div>
            <ClipboardPlus className="h-14 w-14 text-primary" />
          </div>
        </header>

        <Card className="bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Nueva falla reportada</CardTitle>
          </CardHeader>
          <CardContent>
            {assetError ? <Message tone="error" text={assetError} /> : null}
            {folio ? (
              <Message
                tone="success"
                text={`Orden de Trabajo ${folio} creada con estado Abierta.`}
              />
            ) : null}
            {submitError ? <Message tone="error" text={submitError} /> : null}

            <form
              className="mt-4 grid gap-5"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Activo" error={errors.assetCode}>
                  <select
                    className="field"
                    value={form.assetCode}
                    disabled={isLoadingAssets || isSubmitting}
                    onChange={(event) => updateAsset(event.target.value)}
                  >
                    <option value="">
                      {isLoadingAssets
                        ? "Cargando activos..."
                        : "Selecciona un activo"}
                    </option>
                    {assets.map((asset, index) => (
                      <option
                        key={`${asset.codigo}-${index}`}
                        value={asset.codigo}
                      >
                        {getAssetLabel(asset)}
                      </option>
                    ))}
                  </select>
                </Field>
                <ReadOnly
                  label="Fecha y hora automática"
                  value={
                    form.reportedAt
                      ? new Date(form.reportedAt).toLocaleString("es-MX")
                      : "Inicializando fecha y hora..."
                  }
                />
                <ReadOnly label="Código" value={selectedAsset?.codigo || "—"} />
                <ReadOnly label="Área" value={selectedAsset?.area || "—"} />
                <ReadOnly
                  label="Criticidad"
                  value={selectedAsset?.criticidad || "—"}
                />
                <Field label="Persona que reporta" error={errors.reporter}>
                  <input
                    className="field"
                    value={form.reporter}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm({ ...form, reporter: event.target.value })
                    }
                  />
                </Field>
                <Field label="Prioridad" error={errors.priority}>
                  <select
                    className="field"
                    value={form.priority}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority: event.target.value as WorkOrderPriority,
                      })
                    }
                  >
                    {WORK_ORDER_PRIORITIES.map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Condición del equipo"
                  error={errors.equipmentCondition}
                >
                  <select
                    className="field"
                    value={form.equipmentCondition}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        equipmentCondition: event.target
                          .value as EquipmentCondition,
                      })
                    }
                  >
                    {EQUIPMENT_CONDITIONS.map((condition) => (
                      <option key={condition}>{condition}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                label="Descripción clara de la falla"
                error={errors.description}
              >
                <textarea
                  className="field min-h-32"
                  value={form.description}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>
              <Field label="Observaciones opcionales">
                <textarea
                  className="field min-h-24"
                  value={form.observations}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm({ ...form, observations: event.target.value })
                  }
                />
              </Field>

              <button
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting || isLoadingAssets}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? "Creando OT..." : "Crear Orden de Trabajo"}
              </button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
      {error ? <span className="text-red-300">{error}</span> : null}
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 text-sm font-medium text-muted-foreground">
      <span>{label}</span>
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white">
        {value}
      </div>
    </div>
  );
}

function Message({ tone, text }: { tone: "success" | "error"; text: string }) {
  return (
    <div
      className={
        tone === "success"
          ? "mb-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100"
          : "mb-3 flex gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100"
      }
    >
      {tone === "error" ? <AlertCircle className="h-5 w-5" /> : null}
      <span>{text}</span>
    </div>
  );
}
