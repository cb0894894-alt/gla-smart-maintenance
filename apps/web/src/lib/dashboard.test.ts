import { describe, expect, it } from "vitest";
import {
  getAssetDashboardMetrics,
  getCriticalInventory,
  getHistoryDashboardMetrics,
  getIndicatorDashboardMetrics,
  getInventoryDashboardMetrics,
  getPreventiveDashboardMetrics,
  getPriorityWorkOrders,
  getRecentMaintenanceActivity,
  getUpcomingPreventivePlans,
  getWorkOrderDashboardMetrics,
} from "./dashboard";

describe("dashboard aggregations", () => {
  const now = new Date("2026-07-17T12:00:00Z");

  it("calculates asset and work order metrics", () => {
    expect(
      getAssetDashboardMetrics([
        {
          codigo: "A1",
          nombre: "",
          tipo: "",
          sucursal: "",
          area: "",
          ubicacion: "",
          marca: "",
          modelo: "",
          estado: "Operando",
          criticidad: "",
        },
        {
          codigo: "A2",
          nombre: "",
          tipo: "",
          sucursal: "",
          area: "",
          ubicacion: "",
          marca: "",
          modelo: "",
          estado: "Detenido",
          criticidad: "",
        },
      ]),
    ).toEqual({ total: 2, operando: 1 });

    expect(
      getWorkOrderDashboardMetrics(
        [
          {
            folio: "OT-1",
            fechaHoraReporte: "2026-07-15T10:00:00Z",
            codigoActivo: "",
            activo: "Bomba",
            area: "",
            criticidad: "",
            reporta: "",
            descripcionFalla: "",
            prioridad: "Crítica",
            condicionEquipo: "",
            observaciones: "",
            estado: "Abierta",
            origen: "",
          },
          {
            folio: "OT-2",
            fechaHoraReporte: "2026-07-17T10:00:00Z",
            codigoActivo: "",
            activo: "Motor",
            area: "",
            criticidad: "",
            reporta: "",
            descripcionFalla: "",
            prioridad: "Media",
            condicionEquipo: "",
            observaciones: "",
            estado: "Cerrada",
            origen: "",
          },
        ],
        now,
      ),
    ).toEqual({ abiertas: 1, urgentes: 1, vencidas: 1 });
  });

  it("calculates preventive, inventory, history and latest indicator metrics", () => {
    expect(
      getPreventiveDashboardMetrics(
        [
          {
            idPM: "PM1",
            codigoActivo: "",
            activo: "",
            area: "",
            tarea: "",
            frecuencia: "",
            unidadFrecuencia: "",
            ultimaEjecucion: "",
            proximaEjecucion: "2026-07-20",
            responsable: "",
            estado: "Activo",
            prioridad: "",
            duracionEstimada: "",
            instrucciones: "",
            observaciones: "",
            fechaCreacion: "",
            fechaActualizacion: "",
          },
          {
            idPM: "PM2",
            codigoActivo: "",
            activo: "",
            area: "",
            tarea: "",
            frecuencia: "",
            unidadFrecuencia: "",
            ultimaEjecucion: "",
            proximaEjecucion: "2026-07-01",
            responsable: "",
            estado: "Completado",
            prioridad: "",
            duracionEstimada: "",
            instrucciones: "",
            observaciones: "",
            fechaCreacion: "",
            fechaActualizacion: "",
          },
        ],
        now,
      ),
    ).toEqual({ cumplimiento: 50, proximos: 1, vencidos: 0 });

    expect(
      getInventoryDashboardMetrics([
        {
          codigo: "R1",
          refaccion: "",
          categoria: "",
          existencia: 0,
          stockMinimo: 2,
          unidad: "",
          ubicacion: "",
          proveedor: "",
          costoUnitario: 10,
          estado: "",
          ultimaActualizacion: "",
        },
      ]),
    ).toEqual({ total: 1, bajas: 0, agotadas: 1 });
    expect(
      getHistoryDashboardMetrics([
        {
          idHistorial: "H1",
          folioOT: "",
          fechaCierre: "",
          codigoActivo: "",
          activo: "",
          tipoMantenimiento: "Correctivo",
          fallaDetectada: "",
          trabajoRealizado: "",
          tecnico: "",
          tiempoParoHoras: 3,
          costoRefacciones: 10,
          costoManoObra: 20,
          costoTotal: 30,
          estadoFinal: "",
          observaciones: "",
        },
      ]),
    ).toEqual({ servicios: 1, horasParo: 3, costo: 30 });
    expect(
      getIndicatorDashboardMetrics([
        {
          periodo: "2026-06",
          sucursal: "",
          disponibilidadPct: 95,
          mtbfHoras: 100,
          mttrHoras: 4,
          cumplimientoPreventivoPct: 90,
          ordenesCorrectivas: 1,
          ordenesPreventivas: 2,
          horasParo: 3,
          costoMantenimiento: 4,
          fechaActualizacion: "",
        },
      ]),
    ).toEqual({
      periodo: "2026-06",
      disponibilidad: 95,
      mtbf: 100,
      mttr: 4,
      cumplimientoPreventivo: 90,
    });
  });

  it("selects dashboard sections from real module records", () => {
    const orders = [
      {
        folio: "OT-1",
        fechaHoraReporte: "2026-07-16T10:00:00Z",
        codigoActivo: "",
        activo: "A",
        area: "",
        criticidad: "",
        reporta: "",
        descripcionFalla: "",
        prioridad: "Media",
        condicionEquipo: "",
        observaciones: "",
        estado: "Abierta",
        origen: "",
      },
      {
        folio: "OT-2",
        fechaHoraReporte: "2026-07-17T10:00:00Z",
        codigoActivo: "",
        activo: "B",
        area: "",
        criticidad: "",
        reporta: "",
        descripcionFalla: "",
        prioridad: "Alta",
        condicionEquipo: "",
        observaciones: "",
        estado: "Abierta",
        origen: "",
      },
    ];
    expect(getPriorityWorkOrders(orders, now)[0].folio).toBe("OT-2");
    expect(
      getCriticalInventory([
        {
          codigo: "R1",
          refaccion: "Filtro",
          categoria: "",
          existencia: 1,
          stockMinimo: 2,
          unidad: "pza",
          ubicacion: "",
          proveedor: "",
          costoUnitario: 0,
          estado: "",
          ultimaActualizacion: "",
        },
      ]),
    ).toHaveLength(1);
    expect(
      getUpcomingPreventivePlans(
        [
          {
            idPM: "PM1",
            codigoActivo: "",
            activo: "",
            area: "",
            tarea: "",
            frecuencia: "",
            unidadFrecuencia: "",
            ultimaEjecucion: "",
            proximaEjecucion: "2026-07-18",
            responsable: "",
            estado: "Activo",
            prioridad: "",
            duracionEstimada: "",
            instrucciones: "",
            observaciones: "",
            fechaCreacion: "",
            fechaActualizacion: "",
          },
        ],
        now,
      )[0].idPM,
    ).toBe("PM1");
    expect(
      getRecentMaintenanceActivity([
        {
          idHistorial: "H1",
          folioOT: "OT-1",
          fechaCierre: "2026-07-16",
          codigoActivo: "",
          activo: "",
          tipoMantenimiento: "",
          fallaDetectada: "",
          trabajoRealizado: "",
          tecnico: "",
          tiempoParoHoras: 0,
          costoRefacciones: 0,
          costoManoObra: 0,
          costoTotal: 0,
          estadoFinal: "",
          observaciones: "",
        },
      ])[0].folioOT,
    ).toBe("OT-1");
  });
});
