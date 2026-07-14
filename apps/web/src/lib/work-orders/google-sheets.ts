import type { Asset } from "@/lib/assets/google-sheets";

export const WORK_ORDER_PRIORITIES = [
  "Baja",
  "Media",
  "Alta",
  "Crítica",
] as const;
export const EQUIPMENT_CONDITIONS = [
  "Operando",
  "Operando con restricción",
  "Detenido",
] as const;

export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export type FailureReportInput = {
  assetCode: string;
  assetName: string;
  assetArea: string;
  assetCriticality: string;
  reporter: string;
  description: string;
  priority: WorkOrderPriority;
  equipmentCondition: EquipmentCondition;
  reportedAt: string;
  observations?: string;
};

export type CreateWorkOrderResult = {
  folio: string;
  estado: "Abierta" | string;
};

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada.");
  }

  return apiUrl;
}

export function buildFailureReportPayload(
  input: FailureReportInput,
): FailureReportInput & { accion: "crearOrdenTrabajo" } {
  return {
    accion: "crearOrdenTrabajo",
    ...input,
    reporter: input.reporter.trim(),
    description: input.description.trim(),
    observations: input.observations?.trim() || "",
  };
}

export function getAssetLabel(asset: Asset) {
  return [asset.codigo, asset.nombre].filter(Boolean).join(" · ");
}

export function validateFailureReport(input: FailureReportInput) {
  const errors: Partial<Record<keyof FailureReportInput, string>> = {};

  if (!input.assetCode) errors.assetCode = "Selecciona un activo.";
  if (!input.reporter.trim())
    errors.reporter = "Indica quién reporta la falla.";
  if (!input.description.trim()) {
    errors.description = "Describe claramente la falla.";
  }
  if (!input.priority) errors.priority = "Selecciona la prioridad.";
  if (!input.equipmentCondition) {
    errors.equipmentCondition = "Selecciona la condición del equipo.";
  }

  return errors;
}

export async function createWorkOrderFromFailure(input: FailureReportInput) {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(buildFailureReportPayload(input)),
  });

  if (!response.ok) {
    throw new Error(`La API respondió con ${response.status}.`);
  }

  const data = (await response.json()) as Partial<CreateWorkOrderResult> & {
    ok?: boolean;
    error?: string;
  };

  if (data.ok === false || !data.folio) {
    throw new Error(data.error || "La API no confirmó el folio de la OT.");
  }

  return { folio: data.folio, estado: data.estado || "Abierta" };
}
