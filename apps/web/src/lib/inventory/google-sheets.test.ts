import { describe, expect, it } from "vitest";
import {
  filterInventoryItems,
  getInventoryIndicators,
  parseInventoryResponse,
  type InventoryItem,
} from "./google-sheets";

const inventoryItems: InventoryItem[] = [
  {
    codigo: "REF-001",
    refaccion: "Filtro de aceite",
    categoria: "Lubricación",
    existencia: 3,
    stockMinimo: 5,
    unidad: "Pza",
    ubicacion: "Almacén A",
    proveedor: "Acme",
    costoUnitario: 120,
    estado: "Activo",
    ultimaActualizacion: "2026-07-15",
  },
  {
    codigo: "REF-002",
    refaccion: "Correa",
    categoria: "Transmisión",
    existencia: 0,
    stockMinimo: 2,
    unidad: "Pza",
    ubicacion: "Almacén B",
    proveedor: "Global Parts",
    costoUnitario: 80,
    estado: "Agotado",
    ultimaActualizacion: "2026-07-14",
  },
];

describe("inventory Google Sheets helpers", () => {
  it("parses INV_Refacciones rows with the expected headers", () => {
    expect(
      parseInventoryResponse([
        {
          Código: "REF-003",
          Refacción: "Válvula",
          Categoría: "Neumática",
          Existencia: 12,
          "Stock mínimo": 4,
          Unidad: "Pza",
          Ubicación: "Bodega",
          Proveedor: "Parts MX",
          "Costo unitario": 250,
          Estado: "Activo",
          "Última actualización": "2026-07-15",
        },
      ])[0],
    ).toMatchObject({
      codigo: "REF-003",
      refaccion: "Válvula",
      categoria: "Neumática",
      existencia: 12,
      stockMinimo: 4,
      estado: "Activo",
    });
  });

  it("filters inventory items by search, category and status", () => {
    expect(
      filterInventoryItems(inventoryItems, {
        search: "filtro",
        categoria: "Lubricación",
        estado: "Activo",
      }),
    ).toHaveLength(1);
    expect(
      filterInventoryItems(inventoryItems, {
        search: "",
        categoria: "Transmisión",
        estado: "Agotado",
      }),
    ).toHaveLength(1);
  });

  it("computes indicators and detects low stock", () => {
    expect(getInventoryIndicators(inventoryItems)).toEqual({
      total: 2,
      bajas: 1,
      agotadas: 1,
      valorInventario: 360,
    });
    expect(
      inventoryItems.some((item) => item.existencia <= item.stockMinimo),
    ).toBe(true);
  });
});
