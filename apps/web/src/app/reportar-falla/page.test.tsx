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
];
const mocks = vi.hoisted(() => ({
  fetchAssets: vi.fn(),
}));

vi.mock("@/lib/assets/google-sheets", () => ({
  fetchAssets: mocks.fetchAssets,
}));

describe("FailureReportPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.test/api";
    mocks.fetchAssets.mockResolvedValue(assets);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
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

  it("shows clear validation messages for required fields", async () => {
    render(<FailureReportPage />);
    await screen.findByText("BOM-01 · Bomba principal");

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
    await screen.findByText("BOM-01 · Bomba principal");

    fireEvent.change(screen.getByLabelText(/Activo/), {
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
      "https://example.test/api",
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
    await screen.findByText("BOM-01 · Bomba principal");

    fireEvent.change(screen.getByLabelText(/Activo/), {
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
