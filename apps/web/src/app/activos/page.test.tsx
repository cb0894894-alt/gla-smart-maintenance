import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssetsPage from "./page";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

const assets = Array.from({ length: 31 }, (_, index) => ({
  codigo: `ACT-${String(index + 1).padStart(3, "0")}`,
  nombre: index === 30 ? "Bomba crítica" : `Equipo ${index + 1}`,
  tipo: index % 2 === 0 ? "Bomba" : "Motor",
  area: index === 30 ? "Planta Norte" : "Planta Sur",
  marca: "GLA",
  estado: index % 3 === 0 ? "Operando" : "Detenido",
  criticidad: index === 30 ? "Alta" : "Media",
}));

describe("AssetsPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.test/api";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => assets,
      }),
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it("loads real assets endpoint metrics and paginates the table", async () => {
    render(<AssetsPage />);

    expect(screen.getByText("Cargando activos")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "https://example.test/api?accion=activos",
      );
    });

    expect(await screen.findByText("Total de activos")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByText("Activos Operando")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("Criticidad Alta")).toBeInTheDocument();
    expect(
      screen.getByText("Página 1 de 2 · mostrando 25 de 31"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(
      screen.getByText("Página 2 de 2 · mostrando 6 de 31"),
    ).toBeInTheDocument();
  });

  it("filters by code or name and by area status and criticality", async () => {
    render(<AssetsPage />);

    await screen.findByText("ACT-001");
    fireEvent.change(
      screen.getByPlaceholderText("Buscar por código o nombre"),
      { target: { value: "Bomba crítica" } },
    );
    fireEvent.change(screen.getByLabelText("Área"), {
      target: { value: "Planta Norte" },
    });
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "Operando" },
    });
    fireEvent.change(screen.getByLabelText("Criticidad"), {
      target: { value: "Alta" },
    });

    const table = screen.getByRole("table");
    expect(within(table).getByText("ACT-031")).toBeInTheDocument();
    expect(within(table).getByText("Bomba crítica")).toBeInTheDocument();
    expect(
      screen.getByText("Página 1 de 1 · mostrando 1 de 1"),
    ).toBeInTheDocument();
  });

  it("shows an error state when NEXT_PUBLIC_API_URL is missing", async () => {
    process.env.NEXT_PUBLIC_API_URL = "";

    render(<AssetsPage />);

    expect(
      await screen.findByText("No se pudieron cargar los activos"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("NEXT_PUBLIC_API_URL no está configurada."),
    ).toBeInTheDocument();
  });
});
