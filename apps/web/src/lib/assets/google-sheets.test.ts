import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAsset,
  parseAssetsResponse,
  updateAsset,
  validateAsset,
  type AssetMutationInput,
} from "./google-sheets";

const asset: AssetMutationInput = {
  codigo: "ACT-001",
  nombre: "Compresor",
  tipo: "Compresor",
  sucursal: "Centro",
  area: "Producción",
  ubicacion: "Línea 1",
  marca: "Atlas",
  modelo: "GA-30",
  estado: "Operando",
  criticidad: "Alta",
  motivo: "Alta inicial",
  responsable: "admin@gla.test",
};

afterEach(() => vi.unstubAllGlobals());

describe("asset management", () => {
  it("parses branch and location without confusing them with area", () => {
    expect(parseAssetsResponse([{
      Código: "ACT-001", Nombre: "Compresor", Tipo: "Equipo",
      Sucursal: "Centro", Área: "Producción", Ubicación: "Línea 1",
      Marca: "Atlas", Modelo: "GA-30", Estado: "Operando", Criticidad: "Alta",
    }])).toEqual([expect.objectContaining({
      codigo: "ACT-001", sucursal: "Centro", area: "Producción", ubicacion: "Línea 1", modelo: "GA-30",
    })]);
  });

  it("uses codigo when the legacy id column is empty", () => {
    expect(parseAssetsResponse([{ id: "", codigo: "ACT-002", nombre: "Bomba" }])[0].codigo).toBe("ACT-002");
  });

  it("requires the identifying and location fields", () => {
    const errors = validateAsset({ ...asset, sucursal: "", ubicacion: "" });
    expect(errors.sucursal).toBeTruthy();
    expect(errors.ubicacion).toBeTruthy();
  });

  it("allows an empty code when the server will generate it", () => {
    expect(validateAsset({ ...asset, codigo: "" }, false).codigo).toBeUndefined();
  });

  it("sends create and update actions through the protected proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await createAsset(asset);
    await updateAsset({ ...asset, estado: "Baja", motivo: "Retiro definitivo" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ accion: "crearActivo", codigo: "ACT-001" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ accion: "actualizarActivo", estado: "Baja" });
  });
});
