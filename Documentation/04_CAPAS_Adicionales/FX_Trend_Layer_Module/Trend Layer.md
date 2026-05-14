# POLARIS Framework — FX Trend Layer Module — Capa 2

> **Capa 2 del sistema multi-capa.** Sistema de trend following / momentum a corto plazo (1-2 semanas) **filtrado por la dirección macro de Capa 1**. Aumenta la frecuencia de trades sin destruir el edge macro.
>
> **Regla de oro:** Capa 2 NUNCA contradice Capa 1. Si Capa 1 dice long EUR/USD, Capa 2 solo abre longs en EUR/USD; nunca shorts. Sin señal macro de fondo en un par, Capa 2 no opera ese par.
>
> **Input:** Señal_FX(A/B) de Capa 1 (módulo Endogenous + Exogenous + World View).
> **Output:** trades cortos (1-2 semanas) con sizing reducido, basados en setup técnico que confirma el momentum en dirección macro.

---

## Ãndice de secciones

- [1. Filosofía y Diferencias vs Capa 1](01_1._Filosofía_y_Diferencias_vs_Capa_1.md)
- [2. Filtros de Activación](02_2._Filtros_de_Activación.md)
- [3. Setups Técnicos de Entry (Capa 2)](03_3._Setups_Técnicos_de_Entry_(Capa_2).md)
- [4. Position Sizing Capa 2](04_4._Position_Sizing_Capa_2.md)
- [5. Reglas de Salida Específicas](05_5._Reglas_de_Salida_Específicas.md)
- [6. Actualización Dinámica de β para Capa 2](06_6._Actualización_Dinámica_de_β_para_Capa_2.md)
- [7. Pipeline Capa 2](07_7._Pipeline_Capa_2.md)
- [8. Métricas Esperadas Capa 2](08_8._Métricas_Esperadas_Capa_2.md)
- [9. Circuit Breakers Específicos Capa 2](09_9._Circuit_Breakers_Específicos_Capa_2.md)
- [10. Integración con Otros Módulos](10_10._Integración_con_Otros_Módulos.md)
- [11. Activación de Capa 2 (Cuándo desplegar)](11_11._Activación_de_Capa_2_(Cuándo_desplegar).md)
- [12. Parámetros Default Capa 2](12_12._Parámetros_Default_Capa_2.md)
- [13. Errores Específicos a Evitar](13_13._Errores_Específicos_a_Evitar.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/Equities Macro|Equities Macro]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]]


---

## Notas del módulo

[[04_CAPAS_Adicionales/FX_Trend_Layer_Module/01_1._Filosofía_y_Diferencias_vs_Capa_1|01_1._Filosofía_y_Diferencias_vs_Capa_1]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/02_2._Filtros_de_Activación|02_2._Filtros_de_Activación]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/03_3._Setups_Técnicos_de_Entry_(Capa_2)|03_3._Setups_Técnicos_de_Entry_(Capa_2)]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/04_4._Position_Sizing_Capa_2|04_4._Position_Sizing_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/05_5._Reglas_de_Salida_Específicas|05_5._Reglas_de_Salida_Específicas]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/06_6._Actualización_Dinámica_de_β_para_Capa_2|06_6._Actualización_Dinámica_de_β_para_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/07_7._Pipeline_Capa_2|07_7._Pipeline_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/08_8._Métricas_Esperadas_Capa_2|08_8._Métricas_Esperadas_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/09_9._Circuit_Breakers_Específicos_Capa_2|09_9._Circuit_Breakers_Específicos_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/10_10._Integración_con_Otros_Módulos|10_10._Integración_con_Otros_Módulos]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/11_11._Activación_de_Capa_2_(Cuándo_desplegar)|11_11._Activación_de_Capa_2_(Cuándo_desplegar)]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/12_12._Parámetros_Default_Capa_2|12_12._Parámetros_Default_Capa_2]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/13_13._Errores_Específicos_a_Evitar|13_13._Errores_Específicos_a_Evitar]]
