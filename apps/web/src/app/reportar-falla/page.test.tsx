import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FailureReportPage from "./page";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const assets = [
  {
    codigo: "BOM-01",
    nombre: "Bomba principal",
    area: "Producción",
    criticidad: "Alta",
    tipo: "Bomba",
    marca: "GLA",
    estado: "Operando",
  },
  {
    codigo: "CMP-02",
    nombre: "Compresor norte",
    area: "Servicios",
    sucursal: "Norte",
    ubicacion: "Cuarto de máquinas",
    criticidad: "Media",
    tipo: "Compresor",
    marca: "Atlas",
    modelo: "X2",
    estado: "Operando",
  },
];
const mocks = vi.hoisted(() => ({
  fetchAssets: vi.fn(),
  fetchWorkOrders: vi.fn(),
}));

vi.mock("@/lib/assets/google-sheets", () => ({
  fetchAssets: mocks.fetchAssets,
}));
vi.mock("@/lib/work-orders/google-sheets", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/work-orders/google-sheets")>();
  return { ...original, fetchWorkOrders: mocks.fetchWorkOrders };
});

describe("FailureReportPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3000/api/google-sheets";
    mocks.fetchAssets.mockResolvedValue(assets);
    mocks.fetchWorkOrders.mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders a stable neutral automatic date on the server", () => {
    const html = renderToString(<FailureReportPage />);

    expect(html).toContain("Fecha y hora automática");
    expect(html).toContain("Inicializando fecha y hora...");
  });

  it("initializes the automatic report date only after client mount", async () => {
    render(<FailureReportPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Inicializando fecha y hora..."),
      ).not.toBeInTheDocument();
    });
  });

  it("preselects the asset received from a QR link", async () => {
    window.history.replaceState({}, "", "/reportar-falla?activo=BOM-01");

    render(<FailureReportPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Activo seleccionado")).toHaveValue(
        "BOM-01",
      );
    });
  });

  it("searches assets by code, name, branch, area, brand or model", async () => {
    render(<FailureReportPage />);
    await waitFor(() => expect(mocks.fetchAssets).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Buscar activo"), {
      target: { value: "Atlas" },
    });

    expect(
      screen.getByRole("option", { name: "CMP-02 · Compresor norte" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "BOM-01 · Bomba principal" }),
    ).not.toBeInTheDocument();
  });

  it("offers the open orders for the asset received from a QR link", async () => {
    window.history.replaceState({}, "", "/reportar-falla?activo=BOM-01");
    mocks.fetchWorkOrders.mockResolvedValue([
      {
        folio: "OT-20260726-0001",
        fechaHoraReporte: "2026-07-26T08:00:00.000Z",
        codigoActivo: "BOM-01",
        activo: "Bomba principal",
        area: "Producción",
        criticidad: "Alta",
        reporta: "Ana",
        descripcionFalla: "Vibración",
        prioridad: "Alta",
        condicionEquipo: "Operando",
        observaciones: "",
        estado: "Abierta",
        origen: "QR",
      },
    ]);

    render(<FailureReportPage />);

    const link = await screen.findByRole("link", {
      name: /Revisar o cerrar orden/,
    });
    expect(link).toHaveAttribute(
      "href",
      "/ordenes-trabajo?activo=BOM-01&cerrar=OT-20260726-0001",
    );
  });

  it("shows clear validation messages for required fields", async () => {
    render(<FailureReportPage />);
    await waitFor(() => expect(mocks.fetchAssets).toHaveBeenCalled());

    fireEvent.click(
      screen.getByRole("button", { name: "Crear Orden de Trabajo" }),
    );

    expect(
      await screen.findByText("Selecciona un activo."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Indica quién reporta la falla."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Describe claramente la falla."),
    ).toBeInTheDocument();
  });

  it("submits a valid report and confirms the generated folio", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        folio: "OT-20260714-0001",
        estado: "Abierta",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FailureReportPage />);
    await waitFor(() => expect(mocks.fetchAssets).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Buscar activo"), {
      target: { value: "Bomba principal" },
    });
    fireEvent.change(screen.getByLabelText("Activo seleccionado"), {
      target: { value: "BOM-01" },
    });
    fireEvent.change(screen.getByLabelText(/Persona que reporta/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/Descripción clara de la falla/), {
      target: { value: "Vibra demasiado" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Crear Orden de Trabajo" }),
    );

    expect(
      await screen.findByText(
        "Orden de Trabajo OT-20260714-0001 creada con estado Abierta.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/google-sheets",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an API error when Apps Script rejects the request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: false,
        error: "No existe la hoja OT_OrdenesTrabajo",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<FailureReportPage />);
    await waitFor(() => expect(mocks.fetchAssets).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Buscar activo"), {
      target: { value: "BOM-01" },
    });
    fireEvent.change(screen.getByLabelText("Activo seleccionado"), {
      target: { value: "BOM-01" },
    });
    fireEvent.change(screen.getByLabelText(/Persona que reporta/), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText(/Descripción clara de la falla/), {
      target: { value: "Vibra demasiado" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Crear Orden de Trabajo" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("No existe la hoja OT_OrdenesTrabajo"),
      ).toBeInTheDocument();
    });
  });
});
