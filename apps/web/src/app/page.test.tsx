import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

describe("DashboardPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.test/api";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { estado: "Operando" },
          { estado: "Detenido" },
          { estado: "Operando" },
        ],
      }),
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it("renders maintenance modules", async () => {
    render(<DashboardPage />);
    expect(screen.getAllByText("Activos")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Órdenes de trabajo")[0]).toBeInTheDocument();
    expect(screen.getByText("Inventario crítico")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("2 equipos Operando")).toBeInTheDocument();
    });
  });

  it("requests Google Sheets assets using NEXT_PUBLIC_API_URL and accion=activos", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("https://example.test/api?accion=activos");
    });
  });
});
