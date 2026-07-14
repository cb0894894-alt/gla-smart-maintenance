import { describe, expect, it } from "vitest";
import {
  buildFailureReportPayload,
  validateFailureReport,
  type FailureReportInput,
} from "./google-sheets";

const validInput: FailureReportInput = {
  assetCode: "BOM-01",
  assetName: "Bomba principal",
  assetArea: "Producción",
  assetCriticality: "Alta",
  reporter: " Ana ",
  description: " Vibración anormal ",
  priority: "Alta",
  equipmentCondition: "Operando con restricción",
  reportedAt: "2026-07-14T12:00:00.000Z",
  observations: " Revisar sello ",
};

describe("work order Google Sheets helpers", () => {
  it("validates required failure report fields", () => {
    expect(
      validateFailureReport({
        ...validInput,
        assetCode: "",
        reporter: "",
        description: "",
      }),
    ).toMatchObject({
      assetCode: "Selecciona un activo.",
      reporter: "Indica quién reporta la falla.",
      description: "Describe claramente la falla.",
    });
  });

  it("builds the Apps Script write payload", () => {
    expect(buildFailureReportPayload(validInput)).toMatchObject({
      accion: "crearOrdenTrabajo",
      reporter: "Ana",
      description: "Vibración anormal",
      observations: "Revisar sello",
    });
  });
});
