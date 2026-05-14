## Estructura de Archivos

```
C:\Users\Gorka\Documents\Polaris Framework\
├── FX_Trading_Framework.md         ← este documento (orquestador)
├── FX_Endogenous_Module.md         ← módulo §II.5 (modelo predictivo endógeno)
├── FX_Risk_Management_Module.md    ← módulo Parte V (sizing, stops, DD)
├── FX_Execution_Module.md          ← módulo Parte IV (costes, órdenes, broker)
├── FX_Timing_Module.md             ← módulo Parte III (CFTC, técnico, setups)
├── FX_World_View_Module.md         ← módulo Parte I (régimen, GDP, WoC, USD bias)
├── FX_Exogenous_Module.md          ← módulo Parte II.6 (drivers exógenos por divisa)
├── FX_Self_Awareness_Module.md     ← módulo Parte VI (métricas, atribución, journal)
├── FX_Framework_Schema.md          ← mapa navegacional completo
├── FX_Trend_Layer_Module.md        ← Capa 2 (trend FX 1-2 semanas)
├── Equities_Macro_Layer_Module.md  ← Capa 3 (macro aplicado a ETFs/stocks)
├── Implementation_Stack_Module.md  ← stack Python + infra + deployment
├── FX_Emerging_Markets_Module.md   ← cobertura EM (BRL, MXN, ZAR, KRW, etc.)
├── Tax_Fiscal_Module.md            ← tratamiento fiscal España + UK/US
├── Scenario_Library_Module.md      ← 12 eventos históricos + 3 stress tests
├── Disaster_Recovery_Module.md     ← continuidad operativa ante fallos
├── Behavioral_Finance_Module.md    ← psicología, sesgos, disciplina
├── Cross_Asset_Crypto_Commodities_Module.md  ← BTC/ETH + commodities directos
└── Multi_Broker_Module.md          ← gestión coordinada multi-broker
```

Los siguientes módulos se crearán como ficheros separados a medida que se rellenan las fases:
- [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|FX Risk Management Module]] (Fase 2)
- [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|FX Execution Module]] (Fase 3)
- [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|FX Timing Module]] (Fase 4)
- [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|FX World View Module]] (Fase 5)
- [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|FX Exogenous Module]] (Fase 5)
- [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|FX Self-Awareness Module]] (Fase 6)

Cada módulo es independiente y testeable; el framework los orquesta.

---

*Polaris Framework v1.4 — Fases 7a + 7b + 7c + 8a + 8b integradas. Framework conceptualmente COMPLETO: análisis + ejecución + riesgo + feedback + EM + fiscal + scenarios + infra + psicología + cross-asset + multi-broker.*

---

→ Índice del módulo: [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]]
