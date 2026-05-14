# POLARIS Framework — FX Timing the Market Module

> **Parte III del Framework.** Una vez generada la tesis macro (señal del módulo endógeno), define **cuándo** entrar al mercado para optimizar entry y reducir drawdown inicial.
>
> **Filosofía:** la tesis macro puede tardar semanas o meses en realizarse. Sin timing, una tesis correcta puede dar P&L negativo por mal entry (mark-to-market drawdown supera stop antes de que el trade funcione). Timing **no genera tesis**, solo cronometra una tesis ya existente.
>
> **Input:** `Señal_FX(A/B)` con convicción ≥ media del módulo endógeno.
> **Output:** decisión de entrar HOY, esperar pullback, esperar confirmación, o abortar.

---

## Ãndice de secciones

- [1. Principios del Timing](01_1._Principios_del_Timing.md)
- [2. CFTC Commitment of Traders como Timing (§8)](02_2._CFTC_Commitment_of_Traders_como_Timing_(§8).md)
- [3. Análisis Técnico (§9)](03_3._Análisis_Técnico_(§9).md)
- [4. Price Action (§10)](04_4._Price_Action_(§10).md)
- [5. Calendario de Eventos](05_5._Calendario_de_Eventos.md)
- [6. Pipeline de Timing](06_6._Pipeline_de_Timing.md)
- [7. Setups A+ (los que tomar)](07_7._Setups_A+_(los_que_tomar).md)
- [8. Métricas de Timing (output a Self-Awareness)](08_8._Métricas_de_Timing_(output_a_Self-Awareness).md)
- [9. Granularidad por Horizonte](09_9._Granularidad_por_Horizonte.md)
- [10. Integración con Otros Módulos](10_10._Integración_con_Otros_Módulos.md)
- [11. Checklist Pre-Entry (Timing-Specific)](11_11._Checklist_Pre-Entry_(Timing-Specific).md)
- [12. Parámetros Default](12_12._Parámetros_Default.md)
- [13. Errores Comunes a Evitar](13_13._Errores_Comunes_a_Evitar.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/Trend Layer|Trend Layer]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Timing_Module/01_1._Principios_del_Timing|01_1._Principios_del_Timing]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/02_2._CFTC_Commitment_of_Traders_como_Timing_(§8)|02_2._CFTC_Commitment_of_Traders_como_Timing_(§8)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/03_3._Análisis_Técnico_(§9)|03_3._Análisis_Técnico_(§9)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/04_4._Price_Action_(§10)|04_4._Price_Action_(§10)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/05_5._Calendario_de_Eventos|05_5._Calendario_de_Eventos]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/06_6._Pipeline_de_Timing|06_6._Pipeline_de_Timing]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/07_7._Setups_A+_(los_que_tomar)|07_7._Setups_A+_(los_que_tomar)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/08_8._Métricas_de_Timing_(output_a_Self-Awareness)|08_8._Métricas_de_Timing_(output_a_Self-Awareness)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/09_9._Granularidad_por_Horizonte|09_9._Granularidad_por_Horizonte]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/10_10._Integración_con_Otros_Módulos|10_10._Integración_con_Otros_Módulos]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/11_11._Checklist_Pre-Entry_(Timing-Specific)|11_11._Checklist_Pre-Entry_(Timing-Specific)]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/12_12._Parámetros_Default|12_12._Parámetros_Default]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/13_13._Errores_Comunes_a_Evitar|13_13._Errores_Comunes_a_Evitar]]
