import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@/lib/auth/roles";
import UsersPage from "./usuarios/page";
import InventoryPage from "./inventario/page";
import IndicatorsPage from "./indicadores/page";

let currentRole: Role = "Técnico";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth/server", async () => {
  const { redirect } = await import("next/navigation");
  return {
    requireSession: vi.fn(async () => ({
      user: {
        name: "Usuario de prueba",
        email: "usuario@gla.test",
        role: currentRole,
        sucursal: "MZT",
        area: "Mantenimiento",
      },
      exp: Date.now() + 60_000,
    })),
    requireRole: vi.fn(async (allowedRoles: readonly Role[]) => {
      if (!allowedRoles.includes(currentRole)) {
        redirect("/acceso-denegado");
      }
      return {
        user: {
          name: "Usuario de prueba",
          email: "usuario@gla.test",
          role: currentRole,
          sucursal: "MZT",
          area: "Mantenimiento",
        },
        exp: Date.now() + 60_000,
      };
    }),
  };
});

vi.mock("./usuarios/usuarios-client", () => ({
  default: () => <div>Interfaz Usuarios autorizada</div>,
}));
vi.mock("./inventario/inventario-client", () => ({
  default: () => <div>Interfaz Inventario autorizada</div>,
}));
vi.mock("./indicadores/indicadores-client", () => ({
  default: () => <div>Interfaz Indicadores autorizada</div>,
}));

describe("protected page server-side guards", () => {
  beforeEach(() => {
    currentRole = "Técnico";
  });

  it("redirects Técnico from /usuarios before rendering the UI", async () => {
    await expect(UsersPage()).rejects.toThrow("NEXT_REDIRECT:/acceso-denegado");
  });

  it("redirects Técnico from /inventario before rendering the UI", async () => {
    await expect(InventoryPage()).rejects.toThrow(
      "NEXT_REDIRECT:/acceso-denegado",
    );
  });

  it("redirects Técnico from /indicadores before rendering the UI", async () => {
    await expect(IndicatorsPage()).rejects.toThrow(
      "NEXT_REDIRECT:/acceso-denegado",
    );
  });

  it("allows Administrador on /usuarios", async () => {
    currentRole = "Administrador";

    render(await UsersPage());

    expect(screen.getByText("Interfaz Usuarios autorizada")).toBeInTheDocument();
  });

  it("allows Supervisor on /inventario and /indicadores", async () => {
    currentRole = "Supervisor";

    render(await InventoryPage());
    expect(
      screen.getByText("Interfaz Inventario autorizada"),
    ).toBeInTheDocument();

    render(await IndicatorsPage());
    expect(
      screen.getByText("Interfaz Indicadores autorizada"),
    ).toBeInTheDocument();
  });
});
