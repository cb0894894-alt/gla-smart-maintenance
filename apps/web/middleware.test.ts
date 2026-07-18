import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { findActiveCfgUser } from "./src/lib/auth/cfg-users";
import { createSessionToken, SESSION_COOKIE } from "./src/lib/auth/token";
import type { Role } from "./src/lib/auth/roles";

vi.mock("./src/lib/auth/cfg-users", () => ({ findActiveCfgUser: vi.fn() }));
const mockedFindActiveCfgUser = vi.mocked(findActiveCfgUser);

async function requestFor(pathname: string, role: Role) {
  process.env.AUTH_SECRET = "test-secret-for-middleware";
  mockedFindActiveCfgUser.mockResolvedValue({
    idUsuario: "1",
    nombre: `${role} GLA`,
    correo: `${role.toLowerCase()}@gla.test`,
    rol: role,
    sucursal: "MZT",
    area: "Mantenimiento",
    estado: "Activo",
  });
  const token = await createSessionToken(
    {
      user: {
        name: `${role} GLA`,
        email: `${role.toLowerCase()}@gla.test`,
        role,
        sucursal: "MZT",
        area: "Mantenimiento",
      },
      exp: Date.now() + 60_000,
    },
    process.env.AUTH_SECRET,
  );
  return new NextRequest(`https://gla.test${pathname}`, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

async function expectAllowed(role: Role, pathname: string) {
  const response = await middleware(await requestFor(pathname, role));
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
}

async function expectBlocked(role: Role, pathname: string) {
  const response = await middleware(await requestFor(pathname, role));
  expect([307, 403]).toContain(response.status);
  if (response.status === 307) {
    expect(response.headers.get("location")).toBe(
      "https://gla.test/acceso-denegado",
    );
  }
}

describe("middleware authorization with signed session cookies", () => {
  it("blocks Técnico from /usuarios, /indicadores and /inventario before rendering, but allows /activos", async () => {
    await expectBlocked("Técnico", "/usuarios");
    await expectBlocked("Técnico", "/indicadores");
    await expectBlocked("Técnico", "/inventario");
    await expectAllowed("Técnico", "/activos");
  });

  it("allows Administrador to access all protected sections", async () => {
    for (const path of [
      "/usuarios",
      "/indicadores",
      "/inventario",
      "/activos",
    ]) {
      await expectAllowed("Administrador", path);
    }
  });

  it("enforces Supervisor access", async () => {
    await expectBlocked("Supervisor", "/usuarios");
    await expectAllowed("Supervisor", "/indicadores");
    await expectAllowed("Supervisor", "/inventario");
    await expectAllowed("Supervisor", "/activos");
  });

  it("enforces Consulta read-only route access", async () => {
    await expectBlocked("Consulta", "/usuarios");
    await expectBlocked("Consulta", "/indicadores");
    await expectBlocked("Consulta", "/inventario");
    await expectAllowed("Consulta", "/activos");
  });
});
