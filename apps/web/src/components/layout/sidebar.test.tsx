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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => adminSession })),
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TEST_SESSION;
    vi.unstubAllGlobals();
  });

  it("loads the session and renders every Administrador module", async () => {
    render(<Sidebar />);

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();

    for (const label of [
      "Inicio",
      "Activos",
      "Reportar falla",
      "Órdenes de trabajo",
      "Mantenimiento Preventivo",
      "Inventario",
      "Usuarios",
      "Historial",
      "Indicadores",
    ]) {
      expect(
        await screen.findByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }

    expect(screen.getByText("Ana Admin")).toBeInTheDocument();
    expect(screen.getByText("ana@gla.com")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  it("shows the authorized Técnico modules only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          user: {
            name: "Tere Técnica",
            email: "tere@gla.com",
            role: "Técnico",
            sucursal: "MZT",
            area: "Mantto",
          },
          permissions: [
            "activos:read",
            "fallas:create",
            "ordenes:read",
            "ordenes:write",
            "preventivos:read",
            "preventivos:write",
            "historial:read",
          ],
        }),
      })),
    );

    render(<Sidebar />);

    for (const label of [
      "Inicio",
      "Activos",
      "Reportar falla",
      "Órdenes de trabajo",
      "Mantenimiento Preventivo",
      "Historial",
    ]) {
      expect(
        await screen.findByRole("link", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }

    expect(
      screen.queryByRole("link", { name: /Usuarios/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Indicadores/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Inventario/i }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      role: "Supervisor",
      permissions: [
        "activos:read",
        "fallas:create",
        "ordenes:read",
        "preventivos:read",
        "inventario:read",
        "historial:read",
        "indicadores:read",
      ],
      visible: ["Inicio", "Inventario", "Indicadores"],
      hidden: ["Usuarios"],
    },
    {
      role: "Consulta",
      permissions: [
        "activos:read",
        "ordenes:read",
        "preventivos:read",
        "historial:read",
      ],
      visible: ["Inicio", "Activos", "Órdenes de trabajo", "Historial"],
      hidden: ["Reportar falla", "Inventario", "Usuarios", "Indicadores"],
    },
  ])(
    "shows Inicio and only the modules authorized for $role",
    async ({ role, permissions, visible, hidden }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({
            user: {
              name: `Usuario ${role}`,
              email: `${role.toLowerCase()}@gla.com`,
              role,
              sucursal: "MZT",
              area: "Mantenimiento",
            },
            permissions,
          }),
        ),
      );

      render(<Sidebar />);

      for (const label of visible) {
        expect(
          await screen.findByRole("link", { name: new RegExp(label) }),
        ).toBeInTheDocument();
      }
      for (const label of hidden) {
        expect(
          screen.queryByRole("link", { name: new RegExp(label) }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it("shows a clear session error instead of an empty menu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Sesión expirada" }),
      })),
    );

    render(<Sidebar />);

    await waitFor(() =>
      expect(screen.getByText("Sesión expirada")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
