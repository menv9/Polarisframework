## Plan de Desarrollo por Fases

| Fase | Contenido | Estado | Prioridad |
|---|---|---|---|
| **1** | Esqueleto del framework + módulo endógeno integrado | ✅ Completo | — |
| **2** | Parte V — Risk Management (sizing, stops, portfolio) | ✅ Completo → [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|FX Risk Management Module]] | — |
| **3** | Parte IV — Execution & Costs | ✅ Completo → [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|FX Execution Module]] | — |
| **4** | Parte III — Timing the Market | ✅ Completo → [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|FX Timing Module]] | — |
| **5** | Parte I — World View + Parte II.6 Exogenous | ✅ Completo → [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|FX World View Module]] + [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|FX Exogenous Module]] | — |
| **6** | Parte VI — Self-Awareness | ✅ Completo → [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|FX Self-Awareness Module]] | — |
| **7a** | Adiciones críticas: anti-espuria, β dinámico, capital ramp-up, triage diagnóstico | ✅ Completo → §17, §18 endo / §11 risk / §8.3 self-aw | — |
| **7b** | Sistema multi-capa: Capa 2 trend FX + Capa 3 equities | ✅ Completo → [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/Trend Layer|FX Trend Layer Module]] + [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/Equities Macro|Equities Macro Layer Module]] | — |
| **7c** | Implementation stack: Python, infra, automatización, deployment | ✅ Completo → [[05_Implementacion/Implementation_Stack_Module/Implementation Stack|Implementation Stack Module]] | — |
| **8a** | Extensiones críticas: EM + Fiscal/Tax + Scenario Library | ✅ Completo → [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/Emerging Markets|FX Emerging Markets Module]] + [[06_Extensiones_Criticas/Tax_Fiscal_Module/Fiscal|Tax Fiscal Module]] + [[06_Extensiones_Criticas/Scenario_Library_Module/Scenario Library|Scenario Library Module]] | — |
| **8b** | Extensiones operativas: Disaster Recovery + Behavioral + Crypto/Commodities + Multi-Broker | ✅ Completo → 4 módulos | — |

> **Filosofía del orden:** completar primero lo que evita ruina (riesgo, costes), luego lo que mejora P&L (timing), luego lo que da contexto (world view, exogenous), por último lo que requiere historial real (auto-evaluación).

---


---

→ Índice del módulo: [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]]
