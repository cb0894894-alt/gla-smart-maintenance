import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveCfgUser } from "./cfg-users";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://example.com/api");
  global.fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify([
          {
            IdUsuario: "1",
            Nombre: "Ana",
            Correo: "ANA@GLA.COM",
            Rol: " supervisor ",
            Sucursal: "MZT",
            Area: "Mantto",
            Estado: " activo ",
          },
          {
            IdUsuario: "2",
            Nombre: "Beto",
            Correo: "beto@gla.com",
            Rol: " tecnico ",
            Sucursal: "MZT",
            Area: "Mantto",
            Estado: "Inactivo",
          },
          {
            IdUsuario: "3",
            Nombre: "Ceci",
            Correo: "ceci@gla.com",
            Rol: "TÉCNICO",
            Sucursal: "MZT",
            Area: "Mantto",
            Estado: "ACTIVO",
          },
          {
            IdUsuario: "4",
            Nombre: "Dani",
            Correo: "dani@gla.com",
            Rol: "Gerente",
            Sucursal: "MZT",
            Area: "Mantto",
            Estado: "Activo",
          },
        ]),
      ),
  ) as typeof fetch;
});

describe("findActiveCfgUser", () => {
  it("returns an active CFG_Usuarios user by normalized email and canonical role", async () => {
    await expect(findActiveCfgUser(" ana@gla.com ")).resolves.toMatchObject({
      nombre: "Ana",
      rol: "Supervisor",
      estado: "Activo",
    });
  });
  it("accepts technician roles without accents and with uppercase accents", async () => {
    await expect(findActiveCfgUser("ceci@gla.com")).resolves.toMatchObject({
      rol: "Técnico",
      estado: "Activo",
    });
  });
  it("rejects inactive, unknown and invalid-role users", async () => {
    await expect(findActiveCfgUser("beto@gla.com")).resolves.toBeNull();
    await expect(findActiveCfgUser("nadie@gla.com")).resolves.toBeNull();
    await expect(findActiveCfgUser("dani@gla.com")).resolves.toBeNull();
  });
});
