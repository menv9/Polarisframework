## PARTE II — Currency Views

> **Pregunta que responde:** Para cada divisa, ¿cuál es el sesgo direccional (apreciación/depreciación) basado en sus drivers?

Esta parte produce la **tesis direccional** por par de divisas. Es el corazón analítico. La salida es una señal numérica `Señal_FX(A/B)` que después pasa al filtro de Timing.

### §4. Clasificación de Indicadores: Leading / Coincident / Lagging
*[Por desarrollar]* Etiquetar los 24 indicadores del modelo endógeno:
- **Leading** (anticipan): ISM new orders, breakevens 5Y5Y, OIS forward, building permits, yield curve slope.
- **Coincident** (en tiempo real): NFP, retail sales, IP, capacity utilization.
- **Lagging** (confirman ex-post): CPI realizado, GDP realizado, deuda/GDP, NIIP.

Regla operativa: **sobreponderar leading en señal**, usar coincident como confirmación, lagging solo como contexto.

### §5. Endogenous Indicators *(módulo dedicado)*

→ **Ver [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|FX Endogenous Module]]** para la especificación completa.

Cubre 24 indicadores macro internos del país, scoring estadístico (z-scores 10Y), mapeo de signos FX, calibración de pesos por regresión, filtro de régimen, plug-and-play G10 y robustez temporal a 10+ años.

Output del módulo: `Score_FX_Endogenous(país)` por horizonte (corto/medio/largo).

### §6. Exogenous Indicators
*[Por desarrollar]* Drivers externos que afectan a una divisa pero no son endógenos al país. Críticos para divisas dependientes:

| Divisa | Drivers exógenos clave |
|---|---|
| AUD | China PMI, mineral de hierro, balance comercial China |
| CAD | WTI, US ISM, US 10Y, diferencial vs USD |
| NZD | Lácteos (Fonterra GDT), China demanda |
| NOK | Brent, Eurozone growth |
| EUR | US tipos reales (transmisión), DXY |
| JPY | US 10Y (carry), VIX (refugio) |
| CHF | EUR/USD, SNB postura intervención |
| GBP | EUR/GBP, riesgo idiosincrático político |
| EM (genérico) | DXY, US 10Y, EMBI, commodities según país |

Output: `Score_FX_Exogenous(país)` integrado al score total.

### §7. Síntesis: Tesis Direccional por Par
*[Por desarrollar]* Combinación:
```
Señal_Total(A/B) = w_endo · [Score_Endo(A) − Score_Endo(B)]
                 + w_exo  · [Score_Exo(A)  − Score_Exo(B)]
```
Clasificación de convicción (high/medium/low) y plazo dominante (corto/medio/largo). Output pasa a Parte III solo si convicción ≥ medium.

---

→ Módulos detallados: [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]


---

→ Índice del módulo: [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]]
