import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";
import { PERMISSIONS } from "@/lib/auth/permissions";

const adminSession = {
  user: {
    name: "Ana Admin",
    email: "ana@gla.com",
    role: "Administrador",
    sucursal: "MZT",
    area: "TI",
  },
  permissions: [...PERMISSIONS],
};

describe("Sidebar", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TEST_SESSION = "fetch";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => adminSession })));
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TEST_SESSION;
    vi.unstubAllGlobals();
  });

  it("loads the session and renders every Administrador module", async () => {
    render(<Sidebar />);

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();

    for (const label of [
      "Activos",
      "Reportar falla",
      "Órdenes de trabajo",
      "Mantenimiento Preventivo",
      "Inventario",
      "Usuarios",
      "Historial",
      "Indicadores",
    ]) {
      expect(await screen.findByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }

    expect(screen.getByText("Ana Admin")).toBeInTheDocument();
    expect(screen.getByText("ana@gla.com")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
  });

  it("shows a clear session error instead of an empty menu", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Sesión expirada" }) })));

    render(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Sesión expirada")).toBeInTheDocument());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
