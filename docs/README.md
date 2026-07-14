# GLA Smart Maintenance

Proyecto base monorepo para una PWA de mantenimiento inteligente con Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, ESLint, Prettier, Husky y Vitest.

## Estructura

- `apps/web`: aplicación web principal.
- `docs`: documentación funcional y técnica.
- `scripts`: automatizaciones del proyecto.

## Mantenimiento Preventivo Alpha 0.1

La ruta `/mantenimiento-preventivo` consume datos reales de Google Sheets mediante `GET ?accion=preventivos` sobre la pestaña `PM_Preventivos`. La pestaña debe conservar exactamente estas columnas y en este orden: `IdPM`, `CodigoActivo`, `Activo`, `Area`, `Tarea`, `Frecuencia`, `UnidadFrecuencia`, `UltimaEjecucion`, `ProximaEjecucion`, `Responsable`, `Estado`, `Prioridad`, `DuracionEstimada`, `Instrucciones`, `Observaciones`, `FechaCreacion`, `FechaActualizacion`.

El alta de planes usa `POST { accion: "crearPreventivo", ... }`, genera automáticamente `IdPM`, toma el activo desde `ACT_Activos` y calcula `ProximaEjecucion` a partir de `Frecuencia` y `UnidadFrecuencia`. El registro de ejecución usa `POST { accion: "registrarEjecucionPreventivo", idPM, fechaEjecucion, observaciones }` y actualiza únicamente `UltimaEjecucion`, `ProximaEjecucion`, `FechaActualizacion` y, si se captura texto, agrega observaciones sin borrar las existentes.
