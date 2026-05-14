## 🟠 ALTA (mejoraría mucho la robustez)
5. Disaster Recovery / Business Continuity
Qué pasa si:

Cae internet en medio de un trade
Broker quiebra (FXCM 2015, MF Global precedente)
Data provider deja de funcionar (FRED API down, etc.)
Falla el ordenador / servidor
Operador no puede operar (enfermedad, viaje)
Procedimientos manuales de emergencia, contactos, backups offline
6. Performance Benchmarking vs peers
Sin contexto, un Sharpe 0.7 puede ser excelente o pobre. Falta:

Benchmarks: BarclayHedge FX Trader Index, HFRI Macro Systematic, SG CTA Index, Eurekahedge FX Hedge Fund Index
Cómo evaluar performance vs simple buy-and-hold del DXY
Risk-adjusted comparison metrics
Decisión de "vale la pena seguir vs invertir en index passive"
7. Hedging / Tail Risk Module
El sistema actual no tiene defensa estructural contra tail events:

Cuándo comprar puts FX OTM como seguro
Cuándo usar variance swaps
Long VIX como tail hedge
Coste anual del hedging vs protección en eventos
Régimen-dependent hedging (más protección cuando Risk-OFF emerging)
8. Counterparty Risk Framework
Riesgo de quiebra del broker
Segregación de fondos (FCA, CFTC rules)
Custody de assets en equities (DTC, Euroclear)
Riesgo de banco (depósitos > €100k garantizados)
Diversificación entre brokers (mínimo 2-3 para sumas grandes)
Reglas de allocation máxima por contraparte
9. Behavioral Finance / Psicología del Operador
El factor #1 de fracaso de sistemas cuantitativos es la disciplina humana:

Sesgos cognitivos típicos (loss aversion, recency, overconfidence)
Pre-trade rituals (verificar checklist sin saltos)
Post-loss protocols (cooldown, no operar bajo emoción)
Journaling emocional adicional al trade journal
Detección temprana de "revenge trading"
Cuándo tomar break del sistema (vacaciones obligatorias)

---

→ Índice del módulo: [[README GAPS|Gaps]]
