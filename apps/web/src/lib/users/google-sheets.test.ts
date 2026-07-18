import { describe, expect, it, vi } from "vitest";
import {
  filterUsers,
  getUsersApiUrl,
  parseUsersResponse,
} from "./google-sheets";

describe("users google sheets", () => {
  it("builds the usuarios API URL", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://script.google.com/macros/s/demo/exec",
    );
    expect(getUsersApiUrl()).toBe(
      "http://localhost:3000/api/google-sheets?accion=usuarios",
    );
    vi.unstubAllEnvs();
  });

  it("parses CFG_Usuarios rows", () => {
    expect(
      parseUsersResponse([
        {
          IdUsuario: "USR-0001",
          Nombre: "Ana López",
          Correo: "ana@gla.com",
          Rol: "Administrador",
          Sucursal: "Matriz",
          Area: "Mantenimiento",
          Estado: "Activo",
          FechaCreacion: "2026-07-18T00:00:00.000Z",
          FechaActualizacion: "2026-07-18T00:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        idUsuario: "USR-0001",
        nombre: "Ana López",
        correo: "ana@gla.com",
        rol: "Administrador",
        sucursal: "Matriz",
        area: "Mantenimiento",
        estado: "Activo",
        fechaCreacion: "2026-07-18T00:00:00.000Z",
        fechaActualizacion: "2026-07-18T00:00:00.000Z",
      },
    ]);
  });

  it("filters by search, role and status", () => {
    const users = parseUsersResponse([
      {
        IdUsuario: "USR-0001",
        Nombre: "Ana",
        Correo: "ana@gla.com",
        Rol: "Administrador",
        Sucursal: "Matriz",
        Area: "TI",
        Estado: "Activo",
      },
      {
        IdUsuario: "USR-0002",
        Nombre: "Luis",
        Correo: "luis@gla.com",
        Rol: "Consulta",
        Sucursal: "Norte",
        Area: "Operaciones",
        Estado: "Inactivo",
      },
    ]);

    expect(
      filterUsers(users, {
        search: "norte",
        rol: "Consulta",
        estado: "Inactivo",
      }),
    ).toHaveLength(1);
    expect(
      filterUsers(users, {
        search: "norte",
        rol: "Administrador",
        estado: "Inactivo",
      }),
    ).toHaveLength(0);
  });
});
