import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCloseWorkOrderPayload,
  calculateCloseWorkOrderTotal,
  closeWorkOrder,
  filterWorkOrders,
  getWorkOrderIndicators,
  parseWorkOrdersResponse,
  updateWorkOrderStatus,
  validateCloseWorkOrder,
  validateStatusUpdate,
  type WorkOrder,
} from "./google-sheets";

const orders: WorkOrder[] = [
  {
    folio: "OT-20260713-0001",
    fechaHoraReporte: "2026-07-13T10:00:00.000Z",
    codigoActivo: "A-1",
    activo: "Compresor",
    area: "Producción",
    criticidad: "Alta",
    reporta: "Ana",
    descripcionFalla: "Fuga",
    prioridad: "Crítica",
    condicionEquipo: "Detenido",
    observaciones: "",
    estado: "Abierta",
    origen: "Reporte",
  },
  {
    folio: "OT-20260714-0002",
    fechaHoraReporte: "2026-07-14T10:00:00.000Z",
    codigoActivo: "A-2",
    activo: "Bomba",
    area: "Servicios",
    criticidad: "Media",
    reporta: "Luis",
    descripcionFalla: "Ruido",
    prioridad: "Alta",
    condicionEquipo: "Operando",
    observaciones: "",
    estado: "En proceso",
    origen: "Reporte",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  delete "http://localhost:3000/api/google-sheets";
});

describe("work orders Google Sheets helpers", () => {
  it("reads real sheet rows using OT headers", () => {
    expect(
      parseWorkOrdersResponse([
        {
          Folio: "OT-1",
          FechaHoraReporte: "2026-07-14",
          Activo: "Motor",
          Area: "Línea 1",
          Reporta: "MCA",
          Prioridad: "Media",
          CondicionEquipo: "Operando",
          Estado: "Abierta",
        },
      ])[0],
    ).toMatchObject({
      folio: "OT-1",
      activo: "Motor",
      area: "Línea 1",
      reporta: "MCA",
      estado: "Abierta",
    });
  });
  it("filters by folio, asset, reporter, status, priority and area", () => {
    expect(
      filterWorkOrders(orders, {
        search: "compresor",
        estado: "Abierta",
        prioridad: "Crítica",
        area: "Producción",
      }),
    ).toHaveLength(1);
    expect(
      filterWorkOrders(orders, {
        search: "luis",
        estado: "",
        prioridad: "Alta",
        area: "Servicios",
      })[0].folio,
    ).toBe("OT-20260714-0002");
  });
  it("computes indicators", () => {
    expect(getWorkOrderIndicators(orders)).toEqual({
      total: 2,
      abiertas: 1,
      enProceso: 1,
      cerradas: 0,
      prioridadCritica: 1,
    });
  });
  it("validates the close form and computes total costs", () => {
    expect(
      validateCloseWorkOrder({
        folio: "",
        fechaCierre: "",
        tipoMantenimiento: "Correctivo",
        fallaDetectada: "Fuga",
        trabajoRealizado: "Cambio de sello",
        tecnico: "MCA",
        tiempoParoHoras: -1,
        costoRefacciones: "10",
        costoManoObra: "20",
        estadoFinal: "Operativo",
      }),
    ).toMatchObject({
      folio: "Campo obligatorio.",
      tiempoParoHoras: "El valor no puede ser negativo.",
    });
    expect(
      calculateCloseWorkOrderTotal({
        costoRefacciones: "10.5",
        costoManoObra: 20,
      }),
    ).toBe(30.5);
  });

  it("builds the close work order request payload", () => {
    expect(
      buildCloseWorkOrderPayload({
        folio: " OT-1 ",
        fechaCierre: "2026-07-17",
        tipoMantenimiento: " Correctivo ",
        fallaDetectada: " Fuga ",
        trabajoRealizado: " Cambio de sello ",
        tecnico: " MCA ",
        tiempoParoHoras: "2",
        costoRefacciones: "100",
        costoManoObra: "50",
        estadoFinal: "Operativo",
        observaciones: " OK ",
      }),
    ).toEqual({
      accion: "cerrarOrdenTrabajo",
      folio: "OT-1",
      fechaCierre: "2026-07-17",
      tipoMantenimiento: "Correctivo",
      fallaDetectada: "Fuga",
      trabajoRealizado: "Cambio de sello",
      tecnico: "MCA",
      tiempoParoHoras: 2,
      costoRefacciones: 100,
      costoManoObra: 50,
      costoTotal: 150,
      estadoFinal: "Operativo",
      observaciones: "OK",
    });
  });

  it("closes a work order through the API", async () => {
    process.env.NEXT_PUBLIC_API_URL =
      "https://script.google.com/macros/s/test/exec";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          folio: "OT-1",
          estado: "Cerrada",
          idHistorial: "HIS-00001",
        }),
      ),
    );
    await expect(closeWorkOrder(validCloseInput())).resolves.toMatchObject({
      estado: "Cerrada",
      idHistorial: "HIS-00001",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      accion: "cerrarOrdenTrabajo",
      costoTotal: 150,
    });
  });

  it("accepts idempotent duplicate-history close responses", async () => {
    process.env.NEXT_PUBLIC_API_URL =
      "https://script.google.com/macros/s/test/exec";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          folio: "OT-1",
          estado: "Cerrada",
          alreadyClosed: true,
          duplicateHistory: true,
          idHistorial: "HIS-00001",
        }),
      ),
    );
    await expect(closeWorkOrder(validCloseInput())).resolves.toMatchObject({
      alreadyClosed: true,
      duplicateHistory: true,
      idHistorial: "HIS-00001",
    });
  });

  it.each([
    ["orden inexistente", "No existe la OT OT-X"],
    ["orden ya cerrada", "La orden ya está cerrada"],
    ["error de API", "No existe la hoja MNT_Historial"],
  ])("surfaces close API errors for %s", async (_caseName, error) => {
    process.env.NEXT_PUBLIC_API_URL =
      "https://script.google.com/macros/s/test/exec";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error })),
    );
    await expect(closeWorkOrder(validCloseInput())).rejects.toThrow(error);
  });

  it("requires a closing note when closing", () => {
    expect(
      validateStatusUpdate({ folio: "OT-1", estado: "Cerrada" }),
    ).toContain("nota breve");
  });
  it("updates status through the API and avoids invalid submissions", async () => {
    process.env.NEXT_PUBLIC_API_URL =
      "https://script.google.com/macros/s/test/exec";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, folio: "OT-1", estado: "Asignada" }),
        ),
      );
    await expect(
      updateWorkOrderStatus({ folio: "OT-1", estado: "Asignada" }),
    ).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/google-sheets",
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("surfaces API errors", async () => {
    process.env.NEXT_PUBLIC_API_URL =
      "https://script.google.com/macros/s/test/exec";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "No existe la OT" })),
    );
    await expect(
      updateWorkOrderStatus({ folio: "OT-X", estado: "Cancelada" }),
    ).rejects.toThrow("No existe la OT");
  });
});

function validCloseInput() {
  return {
    folio: "OT-1",
    fechaCierre: "2026-07-17",
    tipoMantenimiento: "Correctivo",
    fallaDetectada: "Fuga",
    trabajoRealizado: "Cambio de sello",
    tecnico: "MCA",
    tiempoParoHoras: 2,
    costoRefacciones: 100,
    costoManoObra: 50,
    estadoFinal: "Operativo",
    observaciones: "OK",
  };
}
