import { describe, expect, it } from "vitest";
import {
  filterMaintenanceHistory,
  getMaintenanceHistoryIndicators,
  parseMaintenanceHistoryResponse,
} from "./google-sheets";

describe("maintenance history google sheets helpers", () => {
  it("normalizes MNT_Historial rows using the expected headers", () => {
    const records = parseMaintenanceHistoryResponse([
      {
        IdHistorial: "H-001",
        FolioOT: "OT-001",
        FechaCierre: "2026-07-10",
        CodigoActivo: "EQ-01",
        Activo: "Compresor",
        TipoMantenimiento: "Correctivo",
        FallaDetectada: "Fuga",
        TrabajoRealizado: "Cambio de sello",
        Tecnico: "Ana",
        TiempoParoHoras: "2.5",
        CostoRefacciones: "$1,200.50",
        CostoManoObra: "300",
        CostoTotal: "$1,500.50",
        EstadoFinal: "Operando",
        Observaciones: "Sin pendientes",
      },
    ]);

    expect(records).toEqual([
      {
        idHistorial: "H-001",
        folioOT: "OT-001",
        fechaCierre: "2026-07-10",
        codigoActivo: "EQ-01",
        activo: "Compresor",
        tipoMantenimiento: "Correctivo",
        fallaDetectada: "Fuga",
        trabajoRealizado: "Cambio de sello",
        tecnico: "Ana",
        tiempoParoHoras: 2.5,
        costoRefacciones: 1200.5,
        costoManoObra: 300,
        costoTotal: 1500.5,
        estadoFinal: "Operando",
        observaciones: "Sin pendientes",
      },
    ]);
  });

  it("calculates indicators and applies search and select filters", () => {
    const records = parseMaintenanceHistoryResponse([
      {
        IdHistorial: "H-001",
        FolioOT: "OT-001",
        CodigoActivo: "EQ-01",
        Activo: "Bomba",
        TipoMantenimiento: "Correctivo",
        Tecnico: "Ana",
        TiempoParoHoras: 2,
        CostoTotal: 100,
        EstadoFinal: "Operando",
      },
      {
        IdHistorial: "H-002",
        FolioOT: "OT-002",
        CodigoActivo: "EQ-02",
        Activo: "Motor",
        TipoMantenimiento: "Preventivo",
        Tecnico: "Luis",
        TiempoParoHoras: "3.5",
        CostoTotal: "250",
        EstadoFinal: "Pendiente",
      },
    ]);

    expect(getMaintenanceHistoryIndicators(records)).toEqual({
      totalServicios: 2,
      correctivos: 1,
      preventivos: 1,
      horasParo: 5.5,
      costoTotal: 350,
    });
    expect(
      filterMaintenanceHistory(records, {
        search: "eq-02",
        tipoMantenimiento: "Preventivo",
        tecnico: "Luis",
        estadoFinal: "Pendiente",
      }),
    ).toHaveLength(1);
  });
});
