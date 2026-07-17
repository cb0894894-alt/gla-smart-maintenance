import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

const responses: Record<string, unknown[]> = {
  activos: [
    { codigo: "A1", nombre: "Compresor", estado: "Operando" },
    { codigo: "A2", nombre: "Bomba", estado: "Detenido" },
  ],
  ordenesTrabajo: [
    {
      folio: "OT-100",
      activo: "Compresor",
      prioridad: "Crítica",
      estado: "Abierta",
      fechaHoraReporte: "2026-07-15T08:00:00Z",
    },
  ],
  preventivos: [
    {
      idPM: "PM-1",
      activo: "Bomba",
      tarea: "Lubricar",
      responsable: "Mantenimiento",
      estado: "Activo",
      proximaEjecucion: "2026-07-20",
    },
  ],
  inventario: [
    {
      codigo: "REF-1",
      refaccion: "Filtro",
      existencia: 0,
      stockMinimo: 2,
      unidad: "pza",
      ubicacion: "Almacén",
    },
  ],
  historial: [
    {
      idHistorial: "H-1",
      folioOT: "OT-099",
      activo: "Bomba",
      fechaCierre: "2026-07-15",
      tipoMantenimiento: "Correctivo",
      tiempoParoHoras: 2,
      costoTotal: 1500,
    },
  ],
  indicadores: [
    { periodo: "2026-06", disponibilidadPct: 97, mtbfHoras: 120, mttrHoras: 3 },
  ],
};

describe("DashboardPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.test/api";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const accion = new URL(input).searchParams.get("accion") || "";
        return { ok: true, json: async () => responses[accion] ?? [] };
      }),
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it("renders real dashboard metrics and sections from Google Sheets modules", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("1 activos operando")).toBeInTheDocument();
    });

    expect(screen.getByText("1 urgentes · 1 vencidas")).toBeInTheDocument();
    expect(screen.getByText("1 próximos · 0 vencidos")).toBeInTheDocument();
    expect(
      screen.getByText("0 existencias bajas · 1 agotadas"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 h paro · $1,500")).toBeInTheDocument();
    expect(
      screen.getByText("MTBF 120 h · MTTR 3 h · 2026-06"),
    ).toBeInTheDocument();
    expect(screen.getByText("OT-100 · Compresor")).toBeInTheDocument();
    expect(screen.getByText("REF-1 · Filtro")).toBeInTheDocument();
    expect(screen.getByText("PM-1 · Bomba")).toBeInTheDocument();
    expect(screen.getByText("OT-099 · Bomba")).toBeInTheDocument();
  });

  it("requests all Google Sheets endpoints using NEXT_PUBLIC_API_URL", async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
    for (const accion of [
      "activos",
      "ordenesTrabajo",
      "preventivos",
      "inventario",
      "historial",
      "indicadores",
    ]) {
      expect(fetch).toHaveBeenCalledWith(
        `https://example.test/api?accion=${accion}`,
      );
    }
  });
});
