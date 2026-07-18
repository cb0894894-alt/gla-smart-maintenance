import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccessDeniedPage from "./page";

const tecnicoSession = {
  user: {
    name: "Tere Técnica",
    email: "tere@gla.test",
    role: "Técnico",
    sucursal: "MZT",
    area: "Mantenimiento",
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
};

describe("AccessDeniedPage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TEST_SESSION = "fetch";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => tecnicoSession })),
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TEST_SESSION;
    vi.unstubAllGlobals();
  });

  it("renders only the standalone denied screen and links Técnico to /activos", async () => {
    render(<AccessDeniedPage />);

    expect(
      screen.getByRole("heading", { name: "Acceso denegado" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Smart Maintenance")).not.toBeInTheDocument();
    expect(screen.queryByText("Inventario de activos")).not.toBeInTheDocument();
    expect(screen.queryByText("Indicadores")).not.toBeInTheDocument();

    const safeLink = await screen.findByRole("link", {
      name: /Ir a mi inicio/i,
    });
    await waitFor(() => expect(safeLink).toHaveAttribute("href", "/activos"));
    expect(
      screen.getByRole("button", { name: /Cerrar sesión/i }),
    ).toBeInTheDocument();
  });
});
