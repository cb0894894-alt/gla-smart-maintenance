import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = join(
  process.cwd(),
  "..",
  "..",
  "scripts",
  "google-apps-script",
  "mca-alpha-0-1.gs",
);
const source = readFileSync(scriptPath, "utf8");
const closeWorkOrderSource = source.slice(
  source.indexOf("function closeWorkOrder_"),
  source.indexOf("function rollbackHistoryAppend_"),
);

describe("Google Apps Script work order closure consistency", () => {
  it("always releases LockService in a finally block", () => {
    expect(closeWorkOrderSource).toContain(
      "const lock = LockService.getScriptLock();",
    );
    expect(closeWorkOrderSource).toContain("} finally {");
    expect(closeWorkOrderSource).toContain("lock.releaseLock();");
  });

  it("validates sheets, headers, folio and duplicate history before appending", () => {
    expect(closeWorkOrderSource.indexOf("ensureHeaders_(otSheet")).toBeLessThan(
      closeWorkOrderSource.indexOf("historySheet.appendRow"),
    );
    expect(closeWorkOrderSource.indexOf("if (rowIndex === -1)")).toBeLessThan(
      closeWorkOrderSource.indexOf("historySheet.appendRow"),
    );
    expect(
      closeWorkOrderSource.indexOf("if (duplicateIndex !== -1)"),
    ).toBeLessThan(closeWorkOrderSource.indexOf("historySheet.appendRow"));
  });

  it("writes history before marking the OT closed and rolls back if closing fails", () => {
    expect(
      closeWorkOrderSource.indexOf("historySheet.appendRow(historyRow)"),
    ).toBeLessThan(closeWorkOrderSource.lastIndexOf('setValue("Cerrada")'));
    expect(closeWorkOrderSource).toContain("rollbackHistoryAppend_");
    expect(source).toContain("sheet.deleteRow(rowNumber)");
    expect(closeWorkOrderSource).toContain(
      "No se marcó como Cerrada sin historial",
    );
  });

  it("treats already closed orders idempotently only when history exists", () => {
    expect(closeWorkOrderSource.indexOf("duplicateHistory: true")).toBeLessThan(
      closeWorkOrderSource.indexOf("ya está cerrada pero no tiene registro"),
    );
    expect(closeWorkOrderSource).toContain(
      "ya está cerrada pero no tiene registro en MNT_Historial",
    );
  });
});
