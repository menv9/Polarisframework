## 🔴 CRÍTICO (sin esto, el sistema no es viable a escala real)
1. Módulo EM (Emerging Markets) dedicado
Mencionado en cada módulo pero solo esqueleto en FX_Exogenous_Module.md §3. EM tiene drivers únicos:

Risk premium soberano (CDS, EMBI) como driver dominante
Reservas FX / cobertura de importaciones
Capital controls / convertibilidad limitada (CNY, INR)
Dollarización de pasivos (efecto balance sheet)
Hiperinflacionarias (ARS, TRY, VES) requieren modelo separado
z-scores 10Y se rompen con quiebres estructurales
Sin esto: solo G10 operable, ~50% del universo FX excluido
2. Backtest Framework metodológico detallado
Implementation_Stack_Module.md §5 lo trata a alto nivel pero falta especificación profunda:

Reconstrucción histórica de bid/ask (no solo close)
Survivorship bias handling (divisas/empresas que dejan de existir)
Combinatorial Purged Cross-Validation (López de Prado)
Bootstrap para intervalos de confianza
Monte Carlo sobre orden de trades
Synthetic scenario testing (qué pasa si Black Monday se repite)
Test de Reality Check de White / Hansen SPA
Sin esto: cualquier backtest tiene riesgo de overfitting no detectado
3. Módulo Fiscal / Tax
FX_Execution_Module.md §6.5 toca el tema en 10 líneas. Insuficiente para España donde el fiscal puede ser 19-47% del P&L:

Tratamiento exacto FX spot vs CFDs vs futuros en España
Modelo 720 obligaciones (cuentas en el extranjero)
Compensación pérdidas/ganancias entre activos
Vehículos: persona física vs SL vs SCR vs EAFI
Estrategias de tax-loss harvesting al cierre del año
Cómo afecta el tax al sizing efectivo y al Sharpe neto
Sin esto: P&L bruto del backtest dista mucho del P&L net of tax real
4. Scenario Library histórico
Sistema dice que sobrevive 10 años pero no documenta cómo se hubiera comportado en eventos históricos clave:

2008 Lehman (USD up, vol explota)
2011 European debt crisis
2015 SNB cap removal (CHF +20% intraday)
2015 China devaluation
2016 Brexit (GBP −10% en una sesión)
2018 EM crisis (TRY −30%)
2020 COVID flash crash
2022 Russia + inflación shock
2023 SVB / banking crisis
Sin esto: no se sabe si los β se mantuvieron, qué circuit breakers hubieran disparado, qué overrides legítimos habrían sido necesarios

---

→ Índice del módulo: [[README GAPS|Gaps]]
