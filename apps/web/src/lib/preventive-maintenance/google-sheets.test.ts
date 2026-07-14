import { describe, expect, it } from "vitest";
import {
  calculateNextExecution,
  filterPreventivePlans,
  getPreventiveIndicators,
  parsePreventivePlansResponse,
  toCalendarDate,
} from "./google-sheets";

const basePlan = {
  idPM: "PM-00001",
  codigoActivo: "AC-1",
  activo: "Bomba",
  area: "Producción",
  tarea: "Inspección",
  frecuencia: "1",
  unidadFrecuencia: "Meses",
  ultimaEjecucion: "2026-07-01",
  proximaEjecucion: "2026-08-01",
  responsable: "Ana",
  estado: "Activo",
  prioridad: "Alta",
  duracionEstimada: "1h",
  instrucciones: "Revisar",
  observaciones: "",
  fechaCreacion: "2026-07-01",
  fechaActualizacion: "2026-07-01",
};

describe("preventive maintenance google sheets helpers", () => {
  it("parses PM_Preventivos rows with exact headers", () => {
    expect(
      parsePreventivePlansResponse([
        {
          IdPM: "PM-00002",
          CodigoActivo: "AC-2",
          Activo: "Compresor",
          Area: "Servicios",
          Tarea: "Lubricar",
          Frecuencia: 2,
          UnidadFrecuencia: "Semanas",
          UltimaEjecucion: "2026-07-01",
          ProximaEjecucion: "2026-07-15",
          Responsable: "Luis",
          Estado: "Activo",
          Prioridad: "Media",
          DuracionEstimada: "30m",
          Instrucciones: "Aplicar grasa",
          Observaciones: "",
          FechaCreacion: "2026-07-01",
          FechaActualizacion: "2026-07-01",
        },
      ]),
    ).toEqual([
      {
        ...basePlan,
        idPM: "PM-00002",
        codigoActivo: "AC-2",
        activo: "Compresor",
        area: "Servicios",
        tarea: "Lubricar",
        frecuencia: "2",
        unidadFrecuencia: "Semanas",
        proximaEjecucion: "2026-07-15",
        responsable: "Luis",
        prioridad: "Media",
        duracionEstimada: "30m",
        instrucciones: "Aplicar grasa",
      },
    ]);
  });

  it("keeps calendar dates stable without UTC day shifts", () => {
    expect(toCalendarDate("2026-07-14")).toBe("2026-07-14");
    expect(toCalendarDate("2026-07-14T00:00:00.000Z")).toBe("2026-07-14");
    expect(calculateNextExecution("2026-07-14", 1, "Días")).toBe("2026-07-15");
    expect(
      parsePreventivePlansResponse([
        {
          IdPM: "PM-00003",
          UltimaEjecucion: "2026-07-14T00:00:00.000Z",
          ProximaEjecucion: "2026-07-21T00:00:00.000Z",
        },
      ])[0],
    ).toMatchObject({
      ultimaEjecucion: "2026-07-14",
      proximaEjecucion: "2026-07-21",
    });
  });

  it("calculates next execution by unit", () => {
    expect(calculateNextExecution("2026-07-01", 10, "Días")).toBe("2026-07-11");
    expect(calculateNextExecution("2026-07-01", 2, "Semanas")).toBe(
      "2026-07-15",
    );
    expect(calculateNextExecution("2026-07-01", 1, "Meses")).toBe("2026-08-01");
    expect(calculateNextExecution("2026-07-01", 1, "Años")).toBe("2027-07-01");
  });

  it("filters plans and computes indicators", () => {
    const plans = [
      { ...basePlan, proximaEjecucion: "2026-07-10" },
      {
        ...basePlan,
        idPM: "PM-00002",
        estado: "Completado",
        prioridad: "Baja",
        area: "Servicios",
      },
    ];
    expect(
      filterPreventivePlans(plans, {
        search: "bomba",
        estado: "Activo",
        prioridad: "Alta",
        area: "Producción",
      }),
    ).toHaveLength(1);
    expect(
      getPreventiveIndicators(plans, new Date("2026-07-14T12:00:00Z")),
    ).toEqual({
      total: 2,
      activos: 1,
      vencidos: 1,
      proximos: 0,
      completados: 1,
    });
  });
});
