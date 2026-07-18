# GLA Smart Maintenance

Proyecto base monorepo para una PWA de mantenimiento inteligente con Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, ESLint, Prettier, Husky y Vitest.

## Estructura

- `apps/web`: aplicación web principal.
- `docs`: documentación funcional y técnica.
- `scripts`: automatizaciones del proyecto.

## Mantenimiento Preventivo Alpha 0.1

La ruta `/mantenimiento-preventivo` consume datos reales de Google Sheets mediante `GET ?accion=preventivos` sobre la pestaña `PM_Preventivos`. La pestaña debe conservar exactamente estas columnas y en este orden: `IdPM`, `CodigoActivo`, `Activo`, `Area`, `Tarea`, `Frecuencia`, `UnidadFrecuencia`, `UltimaEjecucion`, `ProximaEjecucion`, `Responsable`, `Estado`, `Prioridad`, `DuracionEstimada`, `Instrucciones`, `Observaciones`, `FechaCreacion`, `FechaActualizacion`.

El alta de planes usa `POST { accion: "crearPreventivo", ... }`, genera automáticamente `IdPM`, toma el activo desde `ACT_Activos` y calcula `ProximaEjecucion` a partir de `Frecuencia` y `UnidadFrecuencia`. El registro de ejecución usa `POST { accion: "registrarEjecucionPreventivo", idPM, fechaEjecucion, observaciones }` y actualiza únicamente `UltimaEjecucion`, `ProximaEjecucion`, `FechaActualizacion` y, si se captura texto, agrega observaciones sin borrar las existentes.

## Autenticación Google OAuth en localhost

1. En Google Cloud Console crea o selecciona un proyecto y configura la pantalla de consentimiento OAuth.
2. Crea credenciales de tipo **OAuth client ID** para una aplicación web.
3. Agrega `http://localhost:3000` en **Authorized JavaScript origins**.
4. Agrega `http://localhost:3000/api/auth/callback/google` en **Authorized redirect URIs**.
5. Copia el Client ID y Client Secret en `.env.local` como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
6. Define `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google` y un `AUTH_SECRET` local largo y aleatorio.
7. Verifica que `NEXT_PUBLIC_API_URL` apunte al Web App de Apps Script que lee `CFG_Usuarios` real. Solo usuarios con `Estado=Activo` y roles permitidos podrán ingresar.

> Limitación de seguridad: el cliente sigue consumiendo `NEXT_PUBLIC_API_URL` directamente para conservar la integración actual con Google Sheets; por lo tanto, Apps Script debe validar permisos del lado servidor antes de aceptar escrituras.
