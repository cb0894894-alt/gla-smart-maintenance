# Contrato Google Apps Script para MCA Alpha 0.1

Esta versión conecta el módulo real de **Órdenes de Trabajo** con las hojas `ACT_Activos` y `OT_OrdenesTrabajo` sin modificar ni eliminar datos existentes.

## Acciones admitidas

- `GET ?accion=activos`: devuelve los activos reales de la hoja `ACT_Activos`.
- `POST { accion: "crearActivo", ... }`: registra una maquinaria con sucursal, área y ubicación.
- El código se genera como `EQ-SUCURSAL-TI###`; por ejemplo, `EQ-MCA-AL005`.
- `POST { accion: "actualizarActivo", ... }`: actualiza sus datos y registra cambios de ubicación o estado.
- `GET ?accion=movimientosActivos&codigoActivo=...`: consulta la trazabilidad en `ACT_Movimientos`.
- `GET ?accion=componentesActivos`: devuelve motores, bandas y otras partes relacionadas en `ACT_Componentes`.
- `POST { accion: "crearComponenteActivo", ... }`: vincula un componente con su equipo principal y genera su código.
- `GET ?accion=ordenesTrabajo`: devuelve las filas reales de `OT_OrdenesTrabajo` como objetos JSON.
- `POST` con JSON `{ "accion": "crearOrdenTrabajo", ... }`: crea una fila en `OT_OrdenesTrabajo` y responde `{ "ok": true, "folio": "OT-YYYYMMDD-0001", "estado": "Abierta" }`.
- `POST` con JSON `{ "accion": "actualizarEstadoOrdenTrabajo", "folio": "OT-...", "estado": "Asignada" }`: actualiza únicamente la columna `Estado` de una OT existente.
- Para cerrar una OT, el `POST` debe incluir `"estado": "Cerrada"` y `"notaCierre": "..."`; el script rechaza cierres sin nota breve.

## Estados permitidos

- `Abierta`
- `Asignada`
- `En proceso`
- `En espera`
- `Cerrada`
- `Cancelada`

## Estructura requerida de `OT_OrdenesTrabajo`

La hoja debe existir. Si está vacía, el script crea exactamente estos encabezados en la fila 1 al procesar la primera orden; si ya tiene encabezados, los primeros 13 deben estar en este orden:

1. `Folio`
2. `FechaHoraReporte`
3. `CodigoActivo`
4. `Activo`
5. `Area`
6. `Criticidad`
7. `Reporta`
8. `DescripcionFalla`
9. `Prioridad`
10. `CondicionEquipo`
11. `Observaciones`
12. `Estado`
13. `Origen`

Al actualizar estado, el script puede agregar columnas al final para auditoría operativa:

- `FechaHoraActualizacion`
- `NotaCierre` solo cuando el estado nuevo es `Cerrada`

## Nueva versión de Apps Script a desplegar

Desplegar una nueva versión de `scripts/google-apps-script/mca-alpha-0-1.gs` identificada como:

**MCA Alpha 0.1 — Órdenes de Trabajo reales v2**

## Despliegue manual

1. Abrir el spreadsheet operativo de GLA Smart Maintenance.
2. Ir a **Extensiones → Apps Script**.
3. Copiar el contenido completo de `scripts/google-apps-script/mca-alpha-0-1.gs` en el proyecto de Apps Script vinculado.
4. Confirmar que existen las hojas `ACT_Activos` y `OT_OrdenesTrabajo`.
5. Verificar que `OT_OrdenesTrabajo` conserva los encabezados confirmados y que la orden real `OT-20260713-0001` sigue presente.
6. Publicar con **Implementar → Nueva implementación → Aplicación web** o **Administrar implementaciones → Editar → Nueva versión**.
7. Usar acceso compatible con la operación del equipo y copiar la URL de la aplicación web.
8. Configurar `NEXT_PUBLIC_API_URL` en la aplicación web con esa URL.

## Pruebas sin alterar la orden existente

1. Probar lectura de activos en navegador: abrir la URL de Apps Script con `?accion=activos` y confirmar que devuelve una lista JSON.
2. Probar lectura de OT en navegador: abrir la URL con `?accion=ordenesTrabajo` y confirmar que aparece `OT-20260713-0001`.
3. En la app, abrir `/ordenes-trabajo`, buscar `OT-20260713-0001` y abrir su detalle. No presionar **Guardar estado** si no se desea alterar esa orden.
4. Para probar actualización sin tocar la orden existente, crear primero una OT de prueba desde `/reportar-falla` usando un activo real y una descripción que incluya `PRUEBA`. Después actualizar solo esa OT de prueba a `Asignada`, `En proceso`, `En espera`, `Cancelada` o `Cerrada` con nota.
5. Si se requiere una prueba completamente no destructiva, limitarse a los pasos de lectura y detalle; las acciones de actualización siempre escriben en la fila de la OT seleccionada.

## Mantenimiento Preventivo Alpha 0.1

La ruta `/mantenimiento-preventivo` consume datos reales de Google Sheets mediante `GET ?accion=preventivos` sobre la pestaña `PM_Preventivos`. La pestaña debe conservar exactamente estas columnas y en este orden: `IdPM`, `CodigoActivo`, `Activo`, `Area`, `Tarea`, `Frecuencia`, `UnidadFrecuencia`, `UltimaEjecucion`, `ProximaEjecucion`, `Responsable`, `Estado`, `Prioridad`, `DuracionEstimada`, `Instrucciones`, `Observaciones`, `FechaCreacion`, `FechaActualizacion`.

El alta de planes usa `POST { accion: "crearPreventivo", ... }`, genera automáticamente `IdPM`, toma el activo desde `ACT_Activos` y calcula `ProximaEjecucion` a partir de `Frecuencia` y `UnidadFrecuencia`. El registro de ejecución usa `POST { accion: "registrarEjecucionPreventivo", idPM, fechaEjecucion, observaciones }` y actualiza únicamente `UltimaEjecucion`, `ProximaEjecucion`, `FechaActualizacion` y, si se captura texto, agrega observaciones sin borrar las existentes.
