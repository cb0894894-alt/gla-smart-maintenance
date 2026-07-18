import { describe, expect, it } from "vitest";
import {
  can,
  canAccessPath,
  getPermissions,
  normalizeEmail,
  normalizeRole,
  normalizeStatus,
} from "./permissions";
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
    expect(
      getPermissions("Consulta").every((permission) =>
        permission.endsWith(":read"),
      ),
    ).toBe(true);
    expect(can("Consulta", "fallas:create")).toBe(false);
    expect(can("Consulta", "inventario:write")).toBe(false);
  });
  it("normalizes email before matching CFG_Usuarios", () => {
    expect(normalizeEmail("  Usuario@Example.COM ")).toBe(
      "usuario@example.com",
    );
  });
  it("normalizes role accents, case and whitespace before resolving permissions", () => {
    expect(getPermissions(" administrador ")).toContain("usuarios:write");
    expect(getPermissions("tecnico")).toContain("ordenes:write");
  });
  it.each(["Técnico", "Tecnico", "técnico", "tecnico", "  TÉCNICO  "])(
    "normalizes %s to the canonical Técnico role",
    (role) => {
      expect(normalizeRole(role)).toBe("Técnico");
      expect(canAccessPath(role, "/activos")).toBe(true);
      expect(canAccessPath(role, "/reportar-falla")).toBe(true);
      expect(canAccessPath(role, "/ordenes-trabajo")).toBe(true);
      expect(canAccessPath(role, "/mantenimiento-preventivo")).toBe(true);
      expect(canAccessPath(role, "/historial")).toBe(true);
      expect(canAccessPath(role, "/inventario")).toBe(false);
      expect(canAccessPath(role, "/indicadores")).toBe(false);
      expect(canAccessPath(role, "/usuarios")).toBe(false);
      expect(canAccessPath(role, "/")).toBe(false);
    },
  );
  it("denies invalid roles instead of allowing dashboard or data routes", () => {
    expect(normalizeRole("Gerente")).toBeNull();
    expect(getPermissions("Gerente")).toEqual([]);
    expect(canAccessPath("Gerente", "/")).toBe(false);
    expect(canAccessPath("Gerente", "/activos")).toBe(false);
  });
  it("normalizes active and inactive status safely", () => {
    expect(normalizeStatus(" activo ")).toBe("Activo");
    expect(normalizeStatus("INACTIVO")).toBe("Inactivo");
    expect(normalizeStatus("pendiente")).toBeNull();
  });
});

describe("CFG_Usuarios authorization", () => {
  it("parses real CFG_Usuarios columns and excludes inactive users in lookup", async () => {
    const users = parseUsersResponse([
      {
        IdUsuario: "1",
        Nombre: "Ana",
        Correo: "ANA@GLA.COM",
        Rol: "Administrador",
        Sucursal: "MZT",
        Area: "TI",
        Estado: "Activo",
      },
      {
        IdUsuario: "2",
        Nombre: "Beto",
        Correo: "beto@gla.com",
        Rol: "Técnico",
        Sucursal: "MZT",
        Area: "Mantto",
        Estado: "Inactivo",
      },
    ]);
    expect(users).toHaveLength(2);
    expect(users[0].correo).toBe("ANA@GLA.COM");
  });
});
