/**
 * Google Apps Script Web App contract for MCA Alpha 0.1.
 * Supported actions:
 * - GET  ?accion=activos: returns rows from sheet "ACT_Activos" as JSON objects.
 * - GET  ?accion=ordenesTrabajo: returns rows from sheet "OT_OrdenesTrabajo".
 * - GET  ?accion=inventario: returns rows from sheet "INV_Refacciones" as JSON objects.
 * - POST { accion: "crearOrdenTrabajo", ... }: appends a row to "OT_OrdenesTrabajo".
 * - POST { accion: "actualizarEstadoOrdenTrabajo", folio, estado, notaCierre? }: updates only Estado.
 * - GET  ?accion=preventivos: returns rows from sheet "PM_Preventivos".
 * - POST { accion: "crearPreventivo", ... }: appends a preventive plan to "PM_Preventivos".
 * - POST { accion: "registrarEjecucionPreventivo", idPM, fechaEjecucion }: updates UltimaEjecucion and ProximaEjecucion.
 *
 * Expected OT_OrdenesTrabajo columns:
 * Folio, FechaHoraReporte, CodigoActivo, Activo, Area, Criticidad, Reporta,
 * DescripcionFalla, Prioridad, CondicionEquipo, Observaciones, Estado, Origen
 */
const SHEET_ACTIVOS = "ACT_Activos";
const SHEET_OT = "OT_OrdenesTrabajo";
const SHEET_PM = "PM_Preventivos";
const SHEET_INVENTORY = "INV_Refacciones";
const OPERATIONAL_TIME_ZONE = "America/Mazatlan";
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
const PM_HEADERS = [
  "IdPM",
  "CodigoActivo",
  "Activo",
  "Area",
  "Tarea",
  "Frecuencia",
  "UnidadFrecuencia",
  "UltimaEjecucion",
  "ProximaEjecucion",
  "Responsable",
  "Estado",
  "Prioridad",
  "DuracionEstimada",
  "Instrucciones",
  "Observaciones",
  "FechaCreacion",
  "FechaActualizacion",
];
const INVENTORY_HEADERS = [
  "Código",
  "Refacción",
  "Categoría",
  "Existencia",
  "Stock mínimo",
  "Unidad",
  "Ubicación",
  "Proveedor",
  "Costo unitario",
  "Estado",
  "Última actualización",
];

function doGet(e) {
  const accion = e && e.parameter ? e.parameter.accion : "";

  if (accion === "activos") {
    return jsonResponse(readSheetAsObjects_(SHEET_ACTIVOS));
  }

  if (accion === "ordenesTrabajo") {
    return jsonResponse(readSheetAsObjects_(SHEET_OT));
  }

  if (accion === "preventivos") {
    return jsonResponse(readSheetAsObjects_(SHEET_PM));
  }

  if (accion === "inventario") {
    return jsonResponse(readSheetAsObjects_(SHEET_INVENTORY));
  }

  return jsonResponse({ ok: false, error: "Accion no soportada." });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (payload.accion === "crearOrdenTrabajo") {
      return jsonResponse(createWorkOrder_(payload));
    }

    if (payload.accion === "actualizarEstadoOrdenTrabajo") {
      return jsonResponse(updateWorkOrderStatus_(payload));
    }

    if (payload.accion === "crearPreventivo") {
      return jsonResponse(createPreventivePlan_(payload));
    }

    if (payload.accion === "registrarEjecucionPreventivo") {
      return jsonResponse(registerPreventiveExecution_(payload));
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

function updateWorkOrderStatus_(payload) {
  validateRequired_(payload, ["folio", "estado"]);

  const allowedStatuses = [
    "Abierta",
    "Asignada",
    "En proceso",
    "En espera",
    "Cerrada",
    "Cancelada",
  ];
  if (allowedStatuses.indexOf(payload.estado) === -1) {
    throw new Error("Estado no permitido: " + payload.estado);
  }
  if (
    payload.estado === "Cerrada" &&
    !String(payload.notaCierre || "").trim()
  ) {
    throw new Error(
      "Para cerrar una OT debes capturar una nota breve de cierre.",
    );
  }

  const sheet = getSheet_(SHEET_OT);
  ensureHeaders_(sheet, OT_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const folioIndex = headers.indexOf("Folio");
  const estadoIndex = headers.indexOf("Estado");
  const rowIndex = values.findIndex(function (row, index) {
    return (
      index > 0 &&
      String(row[folioIndex]).trim() === String(payload.folio).trim()
    );
  });

  if (rowIndex === -1) throw new Error("No existe la OT " + payload.folio);

  sheet.getRange(rowIndex + 1, estadoIndex + 1).setValue(payload.estado);
  writeOptionalColumn_(
    sheet,
    headers,
    rowIndex + 1,
    "FechaHoraActualizacion",
    new Date(),
  );
  if (payload.estado === "Cerrada") {
    writeOptionalColumn_(
      sheet,
      headers,
      rowIndex + 1,
      "NotaCierre",
      String(payload.notaCierre).trim(),
    );
  }

  return { ok: true, folio: payload.folio, estado: payload.estado };
}

function createPreventivePlan_(payload) {
  validateRequired_(payload, [
    "assetCode",
    "assetName",
    "tarea",
    "frecuencia",
    "unidadFrecuencia",
    "ultimaEjecucion",
    "responsable",
    "prioridad",
  ]);

  const sheet = getSheet_(SHEET_PM);
  ensureHeaders_(sheet, PM_HEADERS, SHEET_PM);
  const lastExecution = formatCalendarDate_(payload.ultimaEjecucion);
  const nextExecution = calculateNextExecution_(
    lastExecution,
    Number(payload.frecuencia),
    String(payload.unidadFrecuencia),
  );
  const now = new Date();
  const idPM = nextPreventiveId_(sheet);

  sheet.appendRow([
    idPM,
    payload.assetCode,
    payload.assetName,
    payload.assetArea || "",
    payload.tarea,
    Number(payload.frecuencia),
    payload.unidadFrecuencia,
    lastExecution,
    nextExecution,
    payload.responsable,
    "Activo",
    payload.prioridad,
    payload.duracionEstimada || "",
    payload.instrucciones || "",
    payload.observaciones || "",
    now,
    now,
  ]);

  return {
    ok: true,
    idPM: idPM,
    estado: "Activo",
    proximaEjecucion: nextExecution,
  };
}

function registerPreventiveExecution_(payload) {
  validateRequired_(payload, ["idPM", "fechaEjecucion"]);

  const sheet = getSheet_(SHEET_PM);
  ensureHeaders_(sheet, PM_HEADERS, SHEET_PM);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idIndex = headers.indexOf("IdPM");
  const rowIndex = values.findIndex(function (row, index) {
    return (
      index > 0 && String(row[idIndex]).trim() === String(payload.idPM).trim()
    );
  });

  if (rowIndex === -1)
    throw new Error("No existe el preventivo " + payload.idPM);

  const rowNumber = rowIndex + 1;
  const frequency = Number(values[rowIndex][headers.indexOf("Frecuencia")]);
  const unit = String(values[rowIndex][headers.indexOf("UnidadFrecuencia")]);
  const executionDate = formatCalendarDate_(payload.fechaEjecucion);
  const nextExecution = calculateNextExecution_(executionDate, frequency, unit);

  sheet
    .getRange(rowNumber, headers.indexOf("UltimaEjecucion") + 1)
    .setValue(executionDate);
  sheet
    .getRange(rowNumber, headers.indexOf("ProximaEjecucion") + 1)
    .setValue(nextExecution);
  sheet
    .getRange(rowNumber, headers.indexOf("FechaActualizacion") + 1)
    .setValue(new Date());

  const notes = String(payload.observaciones || "").trim();
  if (notes) {
    const currentNotes = String(
      values[rowIndex][headers.indexOf("Observaciones")] || "",
    ).trim();
    sheet
      .getRange(rowNumber, headers.indexOf("Observaciones") + 1)
      .setValue(currentNotes ? currentNotes + "\n" + notes : notes);
  }

  return {
    ok: true,
    idPM: payload.idPM,
    ultimaEjecucion: executionDate,
    proximaEjecucion: nextExecution,
  };
}

function calculateNextExecution_(dateValue, frequency, unit) {
  const date = parseCalendarDate_(dateValue);
  if (!frequency || frequency < 1) throw new Error("Frecuencia inválida.");

  const next = new Date(date.getTime());
  if (unit === "Días") next.setDate(next.getDate() + frequency);
  else if (unit === "Semanas") next.setDate(next.getDate() + frequency * 7);
  else if (unit === "Meses") next.setMonth(next.getMonth() + frequency);
  else if (unit === "Años") next.setFullYear(next.getFullYear() + frequency);
  else throw new Error("UnidadFrecuencia no permitida: " + unit);
  return formatCalendarDate_(next);
}

function parseCalendarDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new Error("Fecha de ejecución inválida.");

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatCalendarDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, OPERATIONAL_TIME_ZONE, "yyyy-MM-dd");
  }

  return Utilities.formatDate(
    parseCalendarDate_(value),
    OPERATIONAL_TIME_ZONE,
    "yyyy-MM-dd",
  );
}

function safeFormatCalendarDate_(value) {
  if (value === "" || value === null || typeof value === "undefined") return "";

  try {
    return formatCalendarDate_(value);
  } catch {
    return "";
  }
}

function isPmCalendarDateHeader_(header) {
  return header === "UltimaEjecucion" || header === "ProximaEjecucion";
}

function nextPreventiveId_(sheet) {
  const values = sheet.getDataRange().getValues();
  let max = 0;
  values.slice(1).forEach(function (row) {
    const match = String(row[0] || "").match(/PM-(\d+)/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return "PM-" + String(max + 1).padStart(5, "0");
}

function writeOptionalColumn_(sheet, headers, rowNumber, header, value) {
  let columnIndex = headers.indexOf(header);
  if (columnIndex === -1) {
    columnIndex = headers.length;
    sheet.getRange(1, columnIndex + 1).setValue(header);
    headers.push(header);
  }
  sheet.getRange(rowNumber, columnIndex + 1).setValue(value);
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
        record[header] =
          sheetName === SHEET_PM && isPmCalendarDateHeader_(header)
            ? safeFormatCalendarDate_(row[index])
            : row[index];
        return record;
      }, {});
    });
}

function ensureHeaders_(sheet, headers, sheetName) {
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
      "La hoja " +
        (sheetName || SHEET_OT) +
        " debe tener las columnas: " +
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
