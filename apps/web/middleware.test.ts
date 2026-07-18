import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { findActiveCfgUser } from "./src/lib/auth/cfg-users";
import { SESSION_COOKIE, verifySessionToken } from "./src/lib/auth/token";

vi.mock("./src/lib/auth/cfg-users", () => ({
  findActiveCfgUser: vi.fn(),
}));
vi.mock("./src/lib/auth/token", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./src/lib/auth/token")>();
  return {
    ...actual,
    verifySessionToken: vi.fn(),
  };
});

const mockedFindActiveCfgUser = vi.mocked(findActiveCfgUser);
const mockedVerifySessionToken = vi.mocked(verifySessionToken);

async function requestFor(pathname: string, role = "Técnico") {
  process.env.AUTH_SECRET = "test-secret-for-middleware";
  mockedFindActiveCfgUser.mockResolvedValue({
    idUsuario: "1",
    nombre: "Tere Técnica",
    correo: "tere@gla.test",
    rol: role,
    sucursal: "MZT",
    area: "Mantenimiento",
    estado: "Activo",
  });
  mockedVerifySessionToken.mockResolvedValue({
    user: {
      name: "Tere Técnica",
      email: "tere@gla.test",
      role,
      sucursal: "MZT",
      area: "Mantenimiento",
    },
    exp: Date.now() + 60_000,
  });
  return new NextRequest(`https://gla.test${pathname}`, {
    headers: { cookie: `${SESSION_COOKIE}=test-token` },
  });
}

describe("middleware authorization redirects", () => {
  it("redirects Técnico away from / so protected dashboard content cannot render", async () => {
    const response = await middleware(await requestFor("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://gla.test/acceso-denegado",
    );
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("allows Técnico to access /activos", async () => {
    const response = await middleware(await requestFor("/activos"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows Administrador to access /", async () => {
    const response = await middleware(await requestFor("/", "Administrador"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
