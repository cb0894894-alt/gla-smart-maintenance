import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveCfgUser } from "./cfg-users";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://example.com/api");
  global.fetch = vi.fn(async () => new Response(JSON.stringify([
    { IdUsuario: "1", Nombre: "Ana", Correo: "ANA@GLA.COM", Rol: "Supervisor", Sucursal: "MZT", Area: "Mantto", Estado: "Activo" },
    { IdUsuario: "2", Nombre: "Beto", Correo: "beto@gla.com", Rol: "Técnico", Sucursal: "MZT", Area: "Mantto", Estado: "Inactivo" },
  ]))) as typeof fetch;
});

describe("findActiveCfgUser", () => {
  it("returns an active CFG_Usuarios user by normalized email", async () => {
    await expect(findActiveCfgUser(" ana@gla.com ")).resolves.toMatchObject({ nombre: "Ana", rol: "Supervisor" });
  });
  it("rejects inactive and unknown users", async () => {
    await expect(findActiveCfgUser("beto@gla.com")).resolves.toBeNull();
    await expect(findActiveCfgUser("nadie@gla.com")).resolves.toBeNull();
  });
});
