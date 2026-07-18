import { describe, expect, it } from "vitest";
import { can, canAccessPath, getPermissions, normalizeEmail } from "./permissions";
import { parseUsersResponse } from "@/lib/users/google-sheets";

describe("role authorization", () => {
  it("grants Administrador full access including Usuarios", () => {
    expect(can("Administrador", "usuarios:write")).toBe(true);
    expect(canAccessPath("Administrador", "/usuarios")).toBe(true);
  });
  it("prevents Supervisor and Técnico from user administration", () => {
    expect(can("Supervisor", "usuarios:read")).toBe(false);
    expect(canAccessPath("Técnico", "/usuarios")).toBe(false);
  });
  it("keeps Consulta read-only", () => {
    expect(getPermissions("Consulta").every((permission) => permission.endsWith(":read"))).toBe(true);
    expect(can("Consulta", "fallas:create")).toBe(false);
    expect(can("Consulta", "inventario:write")).toBe(false);
  });
  it("normalizes email before matching CFG_Usuarios", () => {
    expect(normalizeEmail("  Usuario@Example.COM ")).toBe("usuario@example.com");
  });
});

describe("CFG_Usuarios authorization", () => {
  it("parses real CFG_Usuarios columns and excludes inactive users in lookup", async () => {
    const users = parseUsersResponse([
      { IdUsuario: "1", Nombre: "Ana", Correo: "ANA@GLA.COM", Rol: "Administrador", Sucursal: "MZT", Area: "TI", Estado: "Activo" },
      { IdUsuario: "2", Nombre: "Beto", Correo: "beto@gla.com", Rol: "Técnico", Sucursal: "MZT", Area: "Mantto", Estado: "Inactivo" },
    ]);
    expect(users).toHaveLength(2);
    expect(users[0].correo).toBe("ANA@GLA.COM");
  });
});
