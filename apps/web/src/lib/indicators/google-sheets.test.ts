import { describe, expect, it, vi } from "vitest";
import {
  filterIndicators,
  formatIndicatorPeriod,
  getIndicatorsApiUrl,
  getLatestPeriodVariation,
  normalizeIndicatorPeriod,
  parseIndicatorNumber,
  parseIndicatorsResponse,
  sortIndicatorsByPeriod,
} from "./google-sheets";

describe("indicators google sheets helpers", () => {
  it("normalizes KPI_Indicadores rows using the exact headers", () => {
    const records = parseIndicatorsResponse([
      {
        Periodo: "2026-06",
        Sucursal: "Centro",
        DisponibilidadPct: "96.5%",
        MTBFHoras: "120",
        MTTRHoras: "2.5",
        CumplimientoPreventivoPct: "91%",
        OrdenesCorrectivas: "8",
        OrdenesPreventivas: "18",
        HorasParo: "12.25",
        CostoMantenimiento: "$10,500.50",
        FechaActualizacion: "2026-07-01T23:30:00.000Z",
      },
    ]);

    expect(records[0]).toEqual({
      periodo: "2026-06",
      sucursal: "Centro",
      disponibilidadPct: 96.5,
      mtbfHoras: 120,
      mttrHoras: 2.5,
      cumplimientoPreventivoPct: 91,
      ordenesCorrectivas: 8,
      ordenesPreventivas: 18,
      horasParo: 12.25,
      costoMantenimiento: 10500.5,
      fechaActualizacion: "01/07/2026",
    });
  });

  it("normalizes ISO periods without shifting the month by timezone", () => {
    expect(normalizeIndicatorPeriod("2026-01-01T07:00:00.000Z")).toBe(
      "2026-01",
    );
    expect(normalizeIndicatorPeriod("2026-02")).toBe("2026-02");
    expect(normalizeIndicatorPeriod(new Date("2026-03-01T00:30:00.000Z"))).toBe(
      "2026-03",
    );
  });

  it("formats normalized periods for display", () => {
    expect(formatIndicatorPeriod("2026-01")).toBe("Ene 2026");
    expect(formatIndicatorPeriod("2026-02")).toBe("Feb 2026");
    expect(formatIndicatorPeriod("2026-03")).toBe("Mar 2026");
  });

  it("sorts by period and applies branch/range filters", () => {
    const records = parseIndicatorsResponse([
      { Periodo: "2026-03", Sucursal: "Norte", DisponibilidadPct: 94 },
      { Periodo: "2026-01", Sucursal: "Norte", DisponibilidadPct: 90 },
      { Periodo: "2026-02", Sucursal: "Sur", DisponibilidadPct: 92 },
    ]);

    expect(
      sortIndicatorsByPeriod(records).map((record) => record.periodo),
    ).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(
      filterIndicators(records, {
        sucursal: "Norte",
        periodoDesde: "2026-02",
        periodoHasta: "2026-03",
      }).map((record) => record.periodo),
    ).toEqual(["2026-03"]);
  });

  it("calculates latest period variations against the previous period", () => {
    const variation = getLatestPeriodVariation(
      parseIndicatorsResponse([
        {
          Periodo: "2026-05",
          Sucursal: "Centro",
          DisponibilidadPct: 90,
          MTBFHoras: 100,
          MTTRHoras: 4,
          CumplimientoPreventivoPct: 80,
          HorasParo: 20,
          CostoMantenimiento: 1000,
        },
        {
          Periodo: "2026-06",
          Sucursal: "Centro",
          DisponibilidadPct: 95,
          MTBFHoras: 110,
          MTTRHoras: 3,
          CumplimientoPreventivoPct: 85,
          HorasParo: 15,
          CostoMantenimiento: 900,
        },
      ]),
    );

    expect(variation.current?.periodo).toBe("2026-06");
    expect(variation.changes).toMatchObject({
      disponibilidadPct: 5,
      mtbfHoras: 10,
      mttrHoras: -1,
      cumplimientoPreventivoPct: 5,
      horasParo: -5,
      costoMantenimiento: -100,
    });
  });

  it("parses numeric calculations and builds the indicadores API url", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://script.google.com/macros/s/demo/exec?x=1",
    );

    expect(parseIndicatorNumber("$1,234.50 MXN")).toBe(1234.5);
    expect(getIndicatorsApiUrl()).toBe(
      "http://localhost:3000/api/google-sheets?accion=indicadores",
    );

    vi.unstubAllEnvs();
  });
});
