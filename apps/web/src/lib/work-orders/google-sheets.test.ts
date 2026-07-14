import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterWorkOrders,
  getWorkOrderIndicators,
  parseWorkOrdersResponse,
  updateWorkOrderStatus,
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
  delete process.env.NEXT_PUBLIC_API_URL;
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
      process.env.NEXT_PUBLIC_API_URL,
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
