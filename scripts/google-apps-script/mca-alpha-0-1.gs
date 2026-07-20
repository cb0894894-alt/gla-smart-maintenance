/**
 * Google Apps Script Web App contract for MCA Alpha 0.1.
 * Supported actions:
 * - GET  ?accion=activos: returns rows from sheet "ACT_Activos" as JSON objects.
 * - GET  ?accion=ordenesTrabajo: returns rows from sheet "OT_OrdenesTrabajo".
 * - GET  ?accion=inventario: returns rows from sheet "INV_Refacciones" as JSON objects.
 * - GET  ?accion=historial: returns rows from sheet "MNT_Historial" as JSON objects.
 * - GET  ?accion=indicadores: returns rows from sheet "KPI_Indicadores" as JSON objects.
 * - GET  ?accion=usuarios: returns rows from sheet "CFG_Usuarios" as JSON objects.
 * - POST { accion: "crearOrdenTrabajo", ... }: appends a row to "OT_OrdenesTrabajo".
 * - POST { accion: "actualizarEstadoOrdenTrabajo", folio, estado, notaCierre? }: updates only Estado.
 * - POST { accion: "cerrarOrdenTrabajo", folio, ... }: closes an OT and appends MNT_Historial idempotently.
 * - GET  ?accion=preventivos: returns rows from sheet "PM_Preventivos".
 * - POST { accion: "crearPreventivo", ... }: appends a preventive plan to "PM_Preventivos".
 * - POST { accion: "registrarEjecucionPreventivo", idPM, fechaEjecucion }: updates UltimaEjecucion and ProximaEjecucion.
 * - POST { accion: "crearUsuario", ... }: appends a row to "CFG_Usuarios".
 * - POST { accion: "actualizarUsuario", idUsuario, ... }: updates a row in "CFG_Usuarios".
 * - POST { accion: "crearActivo" | "actualizarActivo", ... }: manages ACT_Activos.
 * - GET  ?accion=movimientosActivos&codigoActivo=...: returns asset movement history.
 *
 * Expected OT_OrdenesTrabajo columns:
 * Folio, FechaHoraReporte, CodigoActivo, Activo, Area, Criticidad, Reporta,
 * DescripcionFalla, Prioridad, CondicionEquipo, Observaciones, Estado, Origen
 */
const SHEET_ACTIVOS = "ACT_Activos";
const SHEET_OT = "OT_OrdenesTrabajo";
const SHEET_PM = "PM_Preventivos";
const SHEET_INVENTORY = "INV_Refacciones";
const SHEET_HISTORY = "MNT_Historial";
const SHEET_INDICATORS = "KPI_Indicadores";
const SHEET_USERS = "CFG_Usuarios";
const SHEET_ASSET_MOVEMENTS = "ACT_Movimientos";
const SHEET_ASSET_COMPONENTS = "ACT_Componentes";
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
const HISTORY_HEADERS = [
  "IdHistorial",
  "FolioOT",
  "FechaCierre",
  "CodigoActivo",
  "Activo",
  "TipoMantenimiento",
  "FallaDetectada",
  "TrabajoRealizado",
  "Tecnico",
  "TiempoParoHoras",
  "CostoRefacciones",
  "CostoManoObra",
  "CostoTotal",
  "EstadoFinal",
  "Observaciones",
];
const INDICATOR_HEADERS = [
  "Periodo",
  "Sucursal",
  "DisponibilidadPct",
  "MTBFHoras",
  "MTTRHoras",
  "CumplimientoPreventivoPct",
  "OrdenesCorrectivas",
  "OrdenesPreventivas",
  "HorasParo",
  "CostoMantenimiento",
  "FechaActualizacion",
];
const USER_HEADERS = [
  "IdUsuario",
  "Nombre",
  "Correo",
  "Rol",
  "Sucursal",
  "Area",
  "Estado",
  "FechaCreacion",
  "FechaActualizacion",
];
const USER_ROLES = ["Administrador", "Supervisor", "Técnico", "Consulta"];
const USER_STATUSES = ["Activo", "Inactivo"];
const ASSET_HEADERS = [
  "Código", "Nombre", "Tipo", "Sucursal", "Área", "Ubicación", "Marca", "Modelo",
  "Estado", "Criticidad", "FechaCreación", "FechaActualización"
];
const ASSET_MOVEMENT_HEADERS = [
  "IdMovimiento", "CodigoActivo", "Fecha", "SucursalAnterior", "SucursalNueva",
  "AreaAnterior", "AreaNueva", "UbicacionAnterior", "UbicacionNueva",
  "EstadoAnterior", "EstadoNuevo", "Motivo", "Responsable"
];
const ASSET_COMPONENT_HEADERS = [
  "IdComponente", "CodigoActivo", "CodigoComponente", "Nombre", "Tipo", "Marca",
  "Modelo", "NumeroSerie", "Ubicacion", "Estado", "FechaInstalacion", "FechaCreacion"
];

function doGet(e) {
  const accion = e && e.parameter ? e.parameter.accion : "";

  if (accion === "activos") {
    return jsonResponse(readSheetAsObjects_(SHEET_ACTIVOS));
  }

  if (accion === "movimientosActivos") {
    const codigo = e && e.parameter ? String(e.parameter.codigoActivo || "") : "";
    return jsonResponse(readSheetAsObjects_(SHEET_ASSET_MOVEMENTS).filter(function (item) {
      return !codigo || String(item.CodigoActivo || "") === codigo;
    }));
  }

  if (accion === "componentesActivos") {
    return jsonResponse(readSheetAsObjects_(SHEET_ASSET_COMPONENTS));
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

  if (accion === "historial") {
    return jsonResponse(readSheetAsObjects_(SHEET_HISTORY));
  }

  if (accion === "indicadores") {
    return jsonResponse(readSheetAsObjects_(SHEET_INDICATORS));
  }

  if (accion === "usuarios") {
    return jsonResponse(readSheetAsObjects_(SHEET_USERS));
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

    if (payload.accion === "cerrarOrdenTrabajo") {
      return jsonResponse(closeWorkOrder_(payload));
    }

    if (payload.accion === "crearPreventivo") {
      return jsonResponse(createPreventivePlan_(payload));
    }

    if (payload.accion === "registrarEjecucionPreventivo") {
      return jsonResponse(registerPreventiveExecution_(payload));
    }

    if (payload.accion === "crearUsuario") {
      return jsonResponse(createUser_(payload));
    }

    if (payload.accion === "actualizarUsuario") {
      return jsonResponse(updateUser_(payload));
    }

    if (payload.accion === "crearActivo") {
      return jsonResponse(createAsset_(payload));
    }

    if (payload.accion === "actualizarActivo") {
      return jsonResponse(updateAsset_(payload));
    }

    if (payload.accion === "crearComponenteActivo") {
      return jsonResponse(createAssetComponent_(payload));
    }

    return jsonResponse({ ok: false, error: "Accion no soportada." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function ensureFlexibleHeaders_(sheet, expected) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expected);
    return expected.slice();
  }
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
  expected.forEach(function (header) {
    if (headers.map(normalizeAssetHeader_).indexOf(normalizeAssetHeader_(header)) === -1) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
    }
  });
  return headers;
}

function nextComponentCode_(sheet, headers, assetCode) {
  const parent = String(assetCode).split("-").slice(-2).join("").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  const prefix = "CMP-" + parent + "-";
  const index = headers.map(normalizeAssetHeader_).indexOf(normalizeAssetHeader_("CodigoComponente"));
  let highest = 0;
  if (sheet.getLastRow() >= 2 && index >= 0) {
    sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (row) {
      const match = String(row[0] || "").match(new RegExp("^" + prefix + "(\\d+)$", "i"));
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }
  return prefix + String(highest + 1).padStart(3, "0");
}

function createAssetComponent_(payload) {
  validateRequired_(payload, ["codigoActivo", "nombre", "tipo", "ubicacion", "estado"]);
  const parentSheet = getSheet_(SHEET_ACTIVOS);
  const parentHeaders = ensureAssetHeaders_(parentSheet);
  if (findAssetRow_(parentSheet, parentHeaders, payload.codigoActivo) === -1)
    throw new Error("No existe el equipo principal " + payload.codigoActivo);
  let sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ASSET_COMPONENTS);
  if (!sheet) sheet = SpreadsheetApp.getActive().insertSheet(SHEET_ASSET_COMPONENTS);
  const headers = ensureFlexibleHeaders_(sheet, ASSET_COMPONENT_HEADERS);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const code = nextComponentCode_(sheet, headers, payload.codigoActivo);
    const id = "COMP-" + Utilities.getUuid();
    const values = {
      idcomponente: id, codigoactivo: payload.codigoActivo, codigocomponente: code,
      nombre: payload.nombre, tipo: payload.tipo, marca: payload.marca || "",
      modelo: payload.modelo || "", numeroserie: payload.numeroSerie || "",
      ubicacion: payload.ubicacion, estado: payload.estado,
      fechainstalacion: payload.fechaInstalacion || "", fechacreacion: new Date()
    };
    sheet.appendRow(headers.map(function (header) {
      const key = normalizeAssetHeader_(header).replace(/\s/g, "");
      return values[key] === undefined ? "" : values[key];
    }));
    return { ok: true, codigoComponente: code };
  } finally {
    lock.releaseLock();
  }
}

function normalizeAssetHeader_(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ensureAssetHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ASSET_HEADERS);
    return ASSET_HEADERS.slice();
  }
  const width = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  ASSET_HEADERS.forEach(function (header) {
    if (headers.map(normalizeAssetHeader_).indexOf(normalizeAssetHeader_(header)) === -1) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
    }
  });
  return headers;
}

function assetValue_(row, headers, header) {
  const index = headers.map(normalizeAssetHeader_).indexOf(normalizeAssetHeader_(header));
  return index === -1 ? "" : row[index];
}

function setAssetValue_(sheet, rowNumber, headers, header, value) {
  const index = headers.map(normalizeAssetHeader_).indexOf(normalizeAssetHeader_(header));
  sheet.getRange(rowNumber, index + 1).setValue(value);
}

function findAssetRow_(sheet, headers, codigo) {
  if (sheet.getLastRow() < 2) return -1;
  const codeIndex = headers.map(normalizeAssetHeader_).indexOf("codigo");
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const index = values.findIndex(function (row) { return String(row[codeIndex]).trim() === String(codigo).trim(); });
  return index === -1 ? -1 : index + 2;
}

function validateAssetPayload_(payload, requireCode) {
  const fields = ["nombre", "tipo", "sucursal", "area", "ubicacion", "estado", "criticidad", "responsable"];
  if (requireCode) fields.unshift("codigo");
  validateRequired_(payload, fields);
}

function createAsset_(payload) {
  validateAssetPayload_(payload, false);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
  const sheet = getSheet_(SHEET_ACTIVOS);
  const headers = ensureAssetHeaders_(sheet);
  payload.codigo = nextAssetCode_(sheet, headers, payload.sucursal, payload.tipo);
  const now = new Date();
  const values = {
    id: payload.codigo, codigo: payload.codigo, nombre: payload.nombre, tipo: payload.tipo,
    sucursal: payload.sucursal, area: payload.area, ubicacion: payload.ubicacion,
    marca: payload.marca || "", modelo: payload.modelo || "", estado: payload.estado, criticidad: payload.criticidad,
    fechacreacion: now, fechaactualizacion: now
  };
  sheet.appendRow(headers.map(function (header) {
    const key = normalizeAssetHeader_(header).replace(/\s/g, "");
    return values[key] === undefined ? "" : values[key];
  }));
  appendAssetMovement_(payload.codigo, now, {}, payload);
  return { ok: true, codigo: payload.codigo };
  } finally {
    lock.releaseLock();
  }
}

function updateAsset_(payload) {
  validateAssetPayload_(payload, true);
  const sheet = getSheet_(SHEET_ACTIVOS);
  const headers = ensureAssetHeaders_(sheet);
  const rowNumber = findAssetRow_(sheet, headers, payload.codigo);
  if (rowNumber === -1) throw new Error("No existe el activo " + payload.codigo);
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const previous = {
    sucursal: assetValue_(row, headers, "Sucursal"), area: assetValue_(row, headers, "Área"),
    ubicacion: assetValue_(row, headers, "Ubicación"), estado: assetValue_(row, headers, "Estado")
  };
  const hasTrackedChange = previous.sucursal !== payload.sucursal || previous.area !== payload.area ||
    previous.ubicacion !== payload.ubicacion || previous.estado !== payload.estado;
  if (hasTrackedChange && !payload.motivo) throw new Error("Captura el motivo del cambio.");
  [["Nombre", payload.nombre], ["Tipo", payload.tipo], ["Sucursal", payload.sucursal],
   ["Área", payload.area], ["Ubicación", payload.ubicacion], ["Marca", payload.marca || ""], ["Modelo", payload.modelo || ""],
   ["Estado", payload.estado], ["Criticidad", payload.criticidad], ["FechaActualización", new Date()]
  ].forEach(function (entry) { setAssetValue_(sheet, rowNumber, headers, entry[0], entry[1]); });
  if (hasTrackedChange) {
    appendAssetMovement_(payload.codigo, new Date(), previous, payload);
  }
  return { ok: true, codigo: payload.codigo };
}

function nextAssetCode_(sheet, headers, sucursal, tipo) {
  const branch = String(sucursal || "GEN").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase().slice(0, 6) || "GEN";
  const typeWords = String(tipo || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase()
    .split(/[^A-Z0-9]+/).filter(Boolean);
  const significantWord = typeWords.find(function (word) {
    return ["MAQUINA", "MAQUINARIA", "EQUIPO", "ACTIVO", "DE", "DEL"].indexOf(word) === -1;
  }) || typeWords[0] || "EQ";
  const typeCode = significantWord.slice(0, 2);
  const prefix = "EQ-" + branch + "-" + typeCode;
  const codeIndex = headers.map(normalizeAssetHeader_).indexOf("codigo");
  let highest = 0;
  if (sheet.getLastRow() >= 2 && codeIndex >= 0) {
    const codes = sheet.getRange(2, codeIndex + 1, sheet.getLastRow() - 1, 1).getValues();
    codes.forEach(function (row) {
      const match = String(row[0] || "").match(new RegExp("^" + prefix + "(\\d+)$", "i"));
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }
  return prefix + String(highest + 1).padStart(3, "0");
}

function appendAssetMovement_(codigo, date, previous, current) {
  let sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ASSET_MOVEMENTS);
  if (!sheet) sheet = SpreadsheetApp.getActive().insertSheet(SHEET_ASSET_MOVEMENTS);
  ensureHeaders_(sheet, ASSET_MOVEMENT_HEADERS, SHEET_ASSET_MOVEMENTS);
  sheet.appendRow([
    "MOV-" + Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMddHHmmss"), codigo, date,
    previous.sucursal || "", current.sucursal || "", previous.area || "", current.area || "",
    previous.ubicacion || "", current.ubicacion || "", previous.estado || "", current.estado || "",
    current.motivo || "Alta inicial", current.responsable || ""
  ]);
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

function closeWorkOrder_(payload) {
  validateRequired_(payload, ["folio"]);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const otSheet = getSheet_(SHEET_OT);
    const historySheet = getSheet_(SHEET_HISTORY);
    ensureHeaders_(otSheet, OT_HEADERS, SHEET_OT);
    ensureHeaders_(historySheet, HISTORY_HEADERS, SHEET_HISTORY);

    const otValues = otSheet.getDataRange().getValues();
    const otHeaders = otValues[0].map(String);
    const folioIndex = otHeaders.indexOf("Folio");
    const estadoIndex = otHeaders.indexOf("Estado");
    const codigoIndex = otHeaders.indexOf("CodigoActivo");
    const activoIndex = otHeaders.indexOf("Activo");
    const rowIndex = otValues.findIndex(function (row, index) {
      return (
        index > 0 &&
        String(row[folioIndex]).trim() === String(payload.folio).trim()
      );
    });
    if (rowIndex === -1) throw new Error("No existe la OT " + payload.folio);

    const historyValues = historySheet.getDataRange().getValues();
    const historyHeaders = historyValues[0].map(String);
    const historyFolioIndex = historyHeaders.indexOf("FolioOT");
    const duplicateIndex = historyValues.findIndex(function (row, index) {
      return (
        index > 0 &&
        String(row[historyFolioIndex]).trim() === String(payload.folio).trim()
      );
    });
    const orderIsAlreadyClosed =
      String(otValues[rowIndex][estadoIndex]).trim() === "Cerrada";

    if (duplicateIndex !== -1) {
      if (!orderIsAlreadyClosed) {
        otSheet.getRange(rowIndex + 1, estadoIndex + 1).setValue("Cerrada");
      }
      return {
        ok: true,
        folio: payload.folio,
        estado: "Cerrada",
        alreadyClosed: true,
        duplicateHistory: true,
        idHistorial:
          historyValues[duplicateIndex][historyHeaders.indexOf("IdHistorial")],
      };
    }

    try {
      validateCloseHistoryPayload_(payload);
    } catch (validationError) {
      if (orderIsAlreadyClosed) {
        throw new Error(
          "La OT " +
            payload.folio +
            " ya está cerrada pero requiere completar su historial en MNT_Historial. " +
            "Envía los datos de cierre completos para reconstruirlo. Detalle: " +
            String(validationError.message || validationError),
        );
      }
      throw validationError;
    }

    const costoRefacciones = Number(payload.costoRefacciones);
    const costoManoObra = Number(payload.costoManoObra);
    const costoTotal = costoRefacciones + costoManoObra;
    const order = otValues[rowIndex];
    const idHistorial = nextHistoryId_(historySheet);
    const historyRow = [
      idHistorial,
      String(payload.folio).trim(),
      formatCalendarDate_(payload.fechaCierre),
      order[codigoIndex],
      order[activoIndex],
      String(payload.tipoMantenimiento).trim(),
      String(payload.fallaDetectada).trim(),
      String(payload.trabajoRealizado).trim(),
      String(payload.tecnico).trim(),
      Number(payload.tiempoParoHoras),
      costoRefacciones,
      costoManoObra,
      costoTotal,
      String(payload.estadoFinal).trim(),
      String(payload.observaciones || "").trim(),
    ];
    let appendedHistoryRowNumber = 0;

    try {
      historySheet.appendRow(historyRow);
      appendedHistoryRowNumber = historySheet.getLastRow();
      if (!orderIsAlreadyClosed) {
        writeOptionalColumn_(
          otSheet,
          otHeaders,
          rowIndex + 1,
          "FechaHoraActualizacion",
          new Date(),
        );
        writeOptionalColumn_(
          otSheet,
          otHeaders,
          rowIndex + 1,
          "NotaCierre",
          String(payload.observaciones || payload.trabajoRealizado).trim(),
        );
        otSheet.getRange(rowIndex + 1, estadoIndex + 1).setValue("Cerrada");
      }
    } catch (error) {
      rollbackHistoryAppend_(
        historySheet,
        appendedHistoryRowNumber,
        idHistorial,
      );
      throw new Error(
        "No se pudo completar el cierre de la OT " +
          payload.folio +
          ". No se marcó como Cerrada sin historial. Detalle: " +
          String(error.message || error),
      );
    }

    return {
      ok: true,
      folio: payload.folio,
      estado: "Cerrada",
      idHistorial: idHistorial,
    };
  } finally {
    lock.releaseLock();
  }
}

function createUser_(payload) {
  validateUserPayload_(payload, false);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEET_USERS);
    ensureHeaders_(sheet, USER_HEADERS, SHEET_USERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const email = normalizeEmail_(payload.correo);
    ensureUniqueUserEmail_(values, headers, email);

    const now = new Date();
    const idUsuario = nextUserId_(values);
    sheet.appendRow([
      idUsuario,
      String(payload.nombre).trim(),
      email,
      String(payload.rol).trim(),
      String(payload.sucursal).trim(),
      String(payload.area).trim(),
      String(payload.estado || "Activo").trim(),
      now,
      now,
    ]);

    return { ok: true, idUsuario: idUsuario };
  } finally {
    lock.releaseLock();
  }
}

function updateUser_(payload) {
  validateRequired_(payload, ["idUsuario"]);
  validateUserPayload_(payload, true);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEET_USERS);
    ensureHeaders_(sheet, USER_HEADERS, SHEET_USERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const idIndex = headers.indexOf("IdUsuario");
    const rowIndex = values.findIndex(function (row, index) {
      return (
        index > 0 &&
        String(row[idIndex]).trim() === String(payload.idUsuario).trim()
      );
    });
    if (rowIndex === -1)
      throw new Error("No existe el usuario " + payload.idUsuario);

    if (payload.correo)
      ensureUniqueUserEmail_(
        values,
        headers,
        normalizeEmail_(payload.correo),
        rowIndex,
      );

    ["Nombre", "Correo", "Rol", "Sucursal", "Area", "Estado"].forEach(
      function (header) {
        const key = userPayloadKey_(header);
        if (typeof payload[key] !== "undefined") {
          const value =
            header === "Correo"
              ? normalizeEmail_(payload[key])
              : String(payload[key]).trim();
          sheet
            .getRange(rowIndex + 1, headers.indexOf(header) + 1)
            .setValue(value);
        }
      },
    );
    sheet
      .getRange(rowIndex + 1, headers.indexOf("FechaActualizacion") + 1)
      .setValue(new Date());

    return { ok: true, idUsuario: payload.idUsuario };
  } finally {
    lock.releaseLock();
  }
}

function validateUserPayload_(payload, partial) {
  if (!partial)
    validateRequired_(payload, ["nombre", "correo", "rol", "sucursal", "area"]);
  if (
    payload.correo &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeEmail_(payload.correo))
  )
    throw new Error("Correo inválido.");
  if (payload.rol && USER_ROLES.indexOf(String(payload.rol).trim()) === -1)
    throw new Error("Rol no permitido: " + payload.rol);
  if (
    payload.estado &&
    USER_STATUSES.indexOf(String(payload.estado).trim()) === -1
  )
    throw new Error("Estado no permitido: " + payload.estado);
}

function normalizeEmail_(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function ensureUniqueUserEmail_(values, headers, email, currentRowIndex) {
  const emailIndex = headers.indexOf("Correo");
  const duplicateIndex = values.findIndex(function (row, index) {
    return (
      index > 0 &&
      index !== currentRowIndex &&
      normalizeEmail_(row[emailIndex]) === email
    );
  });
  if (duplicateIndex !== -1)
    throw new Error("Ya existe un usuario con el correo " + email);
}

function nextUserId_(values) {
  let max = 0;
  values.slice(1).forEach(function (row) {
    const match = String(row[0] || "").match(/USR-(\d+)/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return "USR-" + String(max + 1).padStart(4, "0");
}

function userPayloadKey_(header) {
  return {
    Nombre: "nombre",
    Correo: "correo",
    Rol: "rol",
    Sucursal: "sucursal",
    Area: "area",
    Estado: "estado",
  }[header];
}

function validateCloseHistoryPayload_(payload) {
  validateRequired_(payload, [
    "folio",
    "fechaCierre",
    "tipoMantenimiento",
    "fallaDetectada",
    "trabajoRealizado",
    "tecnico",
    "estadoFinal",
  ]);
  validateNonNegativeNumber_(payload, "tiempoParoHoras");
  validateNonNegativeNumber_(payload, "costoRefacciones");
  validateNonNegativeNumber_(payload, "costoManoObra");
}

function rollbackHistoryAppend_(sheet, rowNumber, idHistorial) {
  if (!rowNumber) return;

  try {
    const currentId = sheet.getRange(rowNumber, 1).getValue();
    if (String(currentId).trim() === String(idHistorial).trim()) {
      sheet.deleteRow(rowNumber);
    }
  } catch (rollbackError) {
    throw new Error(
      "No se pudo revertir el registro de historial " +
        idHistorial +
        ": " +
        String(rollbackError.message || rollbackError),
    );
  }
}

function validateNonNegativeNumber_(payload, field) {
  const value = Number(payload[field]);
  if (payload[field] === "" || isNaN(value) || value < 0) {
    throw new Error("Campo numérico inválido: " + field);
  }
}

function nextHistoryId_(sheet) {
  const values = sheet.getDataRange().getValues();
  let max = 0;
  values.slice(1).forEach(function (row) {
    const match = String(row[0] || "").match(/HIS-(\d+)/);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return "HIS-" + String(max + 1).padStart(5, "0");
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
  if (sheetName === SHEET_ASSET_MOVEMENTS && !SpreadsheetApp.getActive().getSheetByName(sheetName))
    return [];
  const sheet = getSheet_(sheetName);
  if (sheetName === SHEET_HISTORY)
    ensureHeaders_(sheet, HISTORY_HEADERS, SHEET_HISTORY);
  if (sheetName === SHEET_INDICATORS)
    ensureHeaders_(sheet, INDICATOR_HEADERS, SHEET_INDICATORS);
  if (sheetName === SHEET_USERS)
    ensureHeaders_(sheet, USER_HEADERS, SHEET_USERS);
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
