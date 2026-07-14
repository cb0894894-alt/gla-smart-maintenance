/**
 * Google Apps Script Web App contract for MCA Alpha 0.1.
 * Supported actions:
 * - GET  ?accion=activos: returns rows from sheet "ACT_Activos" as JSON objects.
 * - POST { accion: "crearOrdenTrabajo", ... }: appends a row to "OT_OrdenesTrabajo".
 *
 * Expected OT_OrdenesTrabajo columns:
 * Folio, FechaHoraReporte, CodigoActivo, Activo, Area, Criticidad, Reporta,
 * DescripcionFalla, Prioridad, CondicionEquipo, Observaciones, Estado, Origen
 */
const SHEET_ACTIVOS = "ACT_Activos";
const SHEET_OT = "OT_OrdenesTrabajo";
const OT_HEADERS = [
  "Folio",
  "FechaHoraReporte",
  "CodigoActivo",
  "Activo",
  "Area",
  "Criticidad",
  "Reporta",
  "DescripcionFalla",
  "Prioridad",
  "CondicionEquipo",
  "Observaciones",
  "Estado",
  "Origen",
];

function doGet(e) {
  const accion = e && e.parameter ? e.parameter.accion : "";

  if (accion === "activos") {
    return jsonResponse(readSheetAsObjects_(SHEET_ACTIVOS));
  }

  return jsonResponse({ ok: false, error: "Accion no soportada." });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.accion === "crearOrdenTrabajo") {
      return jsonResponse(createWorkOrder_(payload));
    }

    return jsonResponse({ ok: false, error: "Accion no soportada." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function createWorkOrder_(payload) {
  validateRequired_(payload, [
    "assetCode",
    "assetName",
    "reporter",
    "description",
    "priority",
    "equipmentCondition",
  ]);

  const sheet = getSheet_(SHEET_OT);
  ensureHeaders_(sheet, OT_HEADERS);
  const folio = nextWorkOrderFolio_(sheet);
  const row = [
    folio,
    payload.reportedAt ? new Date(payload.reportedAt) : new Date(),
    payload.assetCode,
    payload.assetName,
    payload.assetArea || "",
    payload.assetCriticality || "",
    payload.reporter,
    payload.description,
    payload.priority,
    payload.equipmentCondition,
    payload.observations || "",
    "Abierta",
    "Reporte de falla MCA Alpha 0.1",
  ];

  sheet.appendRow(row);

  return { ok: true, folio: folio, estado: "Abierta" };
}

function nextWorkOrderFolio_(sheet) {
  const nextNumber = Math.max(sheet.getLastRow(), 1);
  const date = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyyMMdd",
  );
  return "OT-" + date + "-" + String(nextNumber).padStart(4, "0");
}

function readSheetAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);

  return values
    .slice(1)
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "";
      });
    })
    .map(function (row) {
      return headers.reduce(function (record, header, index) {
        record[header] = row[index];
        return record;
      }, {});
    });
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const missingHeaders = headers.some(function (header, index) {
    return current[index] !== header;
  });

  if (missingHeaders) {
    throw new Error(
      "La hoja OT_OrdenesTrabajo debe tener las columnas: " +
        headers.join(", "),
    );
  }
}

function validateRequired_(payload, fields) {
  fields.forEach(function (field) {
    if (!payload[field])
      throw new Error("Campo obligatorio faltante: " + field);
  });
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error("No existe la hoja " + sheetName);
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
