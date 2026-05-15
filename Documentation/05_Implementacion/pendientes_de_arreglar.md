# Pendientes de arreglar

Actualizado: 2026-05-15

Este documento recoge los fallos que siguen abiertos tras los ultimos fixes de WorldView, Timing, conviccion por percentiles y notificaciones.

## Altos

| ID | Pendiente | Nota |
| --- | --- | --- |
| #28 | Betas renormalizadas no documentadas | El codigo renormaliza los 15 indicadores implementados, por lo que sus pesos efectivos suben mientras falten los otros 9. Hay que documentarlo claramente o cerrar #35. |

## Medios

| ID | Pendiente | Nota |
| --- | --- | --- |
| #26 | Multi-timeframe sin datos reales | El check de MTF ya puede marcarse/validarse, pero aun no integra niveles reales semanal/mensual. |
| #27 | CFTC check descripcion invertida | Revisar texto de `cftc_clean` para que coincida con la semantica real del filtro. |
| #35 | Faltan 9 indicadores endogenos | NMI, Building Permits, M2, PPI, Core PPI, Fiscal Balance, Interest/GDP, Liquidity, Breakevens. |
| #36 | Trailing/temporal stops no implementados | Falta trailing tras 1R y stop temporal al 80% del horizonte. |

## Bajos

| ID | Pendiente | Nota |
| --- | --- | --- |
| #41 | Navegacion movil | Falta hamburger/menu movil. |
| #42 | Error Boundary | Un crash desmonta toda la app. |
| #43 | Login toggle password | Falta mostrar/ocultar password. |
| #44 | `expectancy.toFixed(0)` pierde decimales | Mantener decimales en metrica clave. |
| #45 | `window.confirm` en Journal | Reemplazar por modal themed. |
| #46 | HeroSection scroll listener muerto | Eliminar o reconectar. |
| #47 | WorldViewTheory imports sin usar | Limpiar imports muertos. |
| #48 | `CFTC_OWN` y `CB_BAL_WIRED` unused | Eliminar o conectar. |
| #49 | ProtectedRoute path al redirigir | Verificar antes: puede estar ya resuelto. |
| #50 | Notifications `reviewed` sin user ID | Scopear por usuario para evitar mezcla entre cuentas. |
| #51 | `appStore.activeModule` sin uso real | Se escribe pero casi no se consume. |
| #52 | `ModulesGrid` pasa `index` a `ModuleCard` | Prop no aceptada/usada. |
| #53 | ArchitectureSection muestra strings en vez de iconos | Cambiar `LAYERS`, `CLOCK`, etc. por iconos reales. |
| #54 | Mojibake en `DataPage.splitModuleName` | Corregir el em-dash roto. |

## Orden recomendado

1. Completar modelo endogeno: #35 y despues #28.
2. Completar stops y timing avanzado: #26 y #36.
3. Limpiar bajos visuales/UX: #41-#54.

## Notas de trabajo

- `beta_pipeline/` aparece como no trackeado en el working tree y no forma parte de esta lista.
- Antes de atacar #49 conviene revisar el estado actual de `ProtectedRoute`, porque puede estar ya corregido.
