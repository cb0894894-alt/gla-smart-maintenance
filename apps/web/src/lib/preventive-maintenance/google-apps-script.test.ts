import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function loadGoogleAppsScriptHelpers(rows: unknown[][]) {
  const scriptPath = join(
    process.cwd(),
    "..",
    "..",
    "scripts",
    "google-apps-script",
    "mca-alpha-0-1.gs",
  );
  const source = readFileSync(scriptPath, "utf8");
  const context = {
    Date,
    Utilities: {
      formatDate(value: Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      },
    },
    SpreadsheetApp: {
      getActive() {
        return {
          getSheetByName() {
            return {
              getDataRange() {
                return {
                  getValues() {
                    return rows;
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    `${source}\nglobalThis.__helpers = { readSheetAsObjects_, formatCalendarDate_ };`,
    context,
  );
  return (
    context as typeof context & {
      __helpers: {
        readSheetAsObjects_: (sheetName: string) => Record<string, unknown>[];
        formatCalendarDate_: (value: unknown) => string;
      };
    }
  ).__helpers;
}

const pmHeaders = ["IdPM", "UltimaEjecucion", "ProximaEjecucion", "Tarea"];

describe("Google Apps Script PM_Preventivos date handling", () => {
  it("accepts Date objects from SpreadsheetApp.getValues as calendar dates", () => {
    const { readSheetAsObjects_ } = loadGoogleAppsScriptHelpers([
      pmHeaders,
      ["PM-00001", new Date(2026, 6, 14), new Date(2026, 6, 21), "Revisar"],
    ]);

    expect(readSheetAsObjects_("PM_Preventivos")).toEqual([
      {
        IdPM: "PM-00001",
        UltimaEjecucion: "2026-07-14",
        ProximaEjecucion: "2026-07-21",
        Tarea: "Revisar",
      },
    ]);
  });

  it("keeps YYYY-MM-DD strings stable", () => {
    const { readSheetAsObjects_ } = loadGoogleAppsScriptHelpers([
      pmHeaders,
      ["PM-00002", "2026-07-14", "2026-07-21", "Lubricar"],
    ]);

    expect(readSheetAsObjects_("PM_Preventivos")[0]).toMatchObject({
      UltimaEjecucion: "2026-07-14",
      ProximaEjecucion: "2026-07-21",
    });
  });

  it("allows empty date cells and does not block all plans on old invalid rows", () => {
    const { readSheetAsObjects_ } = loadGoogleAppsScriptHelpers([
      pmHeaders,
      ["PM-OLD", "fecha anterior", "también inválida", "Antigua"],
      ["PM-EMPTY", "", "", "Nueva"],
    ]);

    expect(readSheetAsObjects_("PM_Preventivos")).toEqual([
      {
        IdPM: "PM-OLD",
        UltimaEjecucion: "",
        ProximaEjecucion: "",
        Tarea: "Antigua",
      },
      {
        IdPM: "PM-EMPTY",
        UltimaEjecucion: "",
        ProximaEjecucion: "",
        Tarea: "Nueva",
      },
    ]);
  });
});
