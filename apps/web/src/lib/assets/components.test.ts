import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, parseComponents, validateComponent, type ComponentInput } from "./components";

const component: ComponentInput = {
  codigoActivo: "EQ-MCA-PE009",
  nombre: "Motor principal",
  tipo: "Motor",
  marca: "WEG",
  modelo: "W22",
  numeroSerie: "SN-1",
  ubicacion: "Interior",
  estado: "Operando",
  fechaInstalacion: "2026-07-19",
};

afterEach(() => vi.unstubAllGlobals());

describe("asset components", () => {
  it("parses component rows from ACT_Componentes", () => {
    expect(parseComponents([{ IdComponente: "1", CodigoActivo: "EQ-MCA-PE009", CodigoComponente: "CMP-PE009-001", Nombre: "Motor", Modelo: "W22" }])[0]).toMatchObject({ codigoActivo: "EQ-MCA-PE009", codigoComponente: "CMP-PE009-001", nombre: "Motor", modelo: "W22" });
  });

  it("validates the parent, name, type and location", () => {
    expect(validateComponent({ ...component, ubicacion: "" })).toContain("dónde");
  });

  it("creates a component through the protected proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true, codigoComponente: "CMP-PE009-001" }) });
    vi.stubGlobal("fetch", fetchMock);
    await createComponent(component);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ accion: "crearComponenteActivo", codigoActivo: "EQ-MCA-PE009" });
  });
});
