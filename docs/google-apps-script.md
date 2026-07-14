# Contrato Google Apps Script para MCA Alpha 0.1

El repositorio solo tenía consumo de `GET ?accion=activos`; esta versión agrega el contrato de escritura para crear órdenes de trabajo reales desde el flujo **Reporte de falla → Orden de Trabajo**.

## Acciones admitidas

- `GET ?accion=activos`: devuelve los activos reales de la hoja `Activos`.
- `POST` con JSON `{ "accion": "crearOrdenTrabajo", ... }`: crea una fila en `OT_OrdenesTrabajo` y responde `{ "ok": true, "folio": "OT-YYYYMMDD-0001", "estado": "Abierta" }`.

## Estructura requerida de `OT_OrdenesTrabajo`

La hoja debe existir con estos encabezados en la fila 1, en este orden:

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

## Despliegue manual

1. Abrir el spreadsheet operativo de GLA Smart Maintenance.
2. Ir a **Extensiones → Apps Script**.
3. Copiar el contenido de `scripts/google-apps-script/mca-alpha-0-1.gs` en el proyecto de Apps Script vinculado.
4. Confirmar que existen las hojas `Activos` y `OT_OrdenesTrabajo` y que `OT_OrdenesTrabajo` tiene los encabezados anteriores.
5. Publicar con **Implementar → Nueva implementación → Aplicación web**.
6. Usar acceso compatible con la operación del equipo y copiar la URL de la aplicación web.
7. Configurar `NEXT_PUBLIC_API_URL` en la aplicación web con esa URL.
