# POLARIS Framework — Equities Macro Layer Module — Capa 3

> **Capa 3 del sistema multi-capa.** Aplica el mismo motor de análisis macro de Capa 1 a renta variable (ETFs sectoriales y large caps macro-sensibles). Reutiliza el trabajo analítico ya hecho para una segunda fuente de P&L.
>
> **Filosofía:** la macro mueve divisas, pero también mueve sectores y empresas dependientes de drivers macro (commodities, ciclo, tipos). Si iron ore sube, no solo sube AUD/USD: suben BHP, RIO, GDX. Una sola tesis, múltiples instrumentos.
>
> **Input:** Score macro de Capa 1 + drivers exógenos por sector/empresa.
> **Output:** posiciones long/short en ETFs y large caps con sizing y horizonte propios.

---

## Ãndice de secciones

- [1. Filosofía y Diferencias vs FX](01_1._Filosofía_y_Diferencias_vs_FX.md)
- [2. Universo de Instrumentos](02_2._Universo_de_Instrumentos.md)
- [3. Mapeo Driver Macro → Instrumento](03_3._Mapeo_Driver_Macro_→_Instrumento.md)
- [4. Construcción del Score para Equities](04_4._Construcción_del_Score_para_Equities.md)
- [5. Position Sizing Capa 3](05_5._Position_Sizing_Capa_3.md)
- [6. Costes y Operativa Específica](06_6._Costes_y_Operativa_Específica.md)
- [7. Pipeline Capa 3](07_7._Pipeline_Capa_3.md)
- [8. Métricas Esperadas Capa 3](08_8._Métricas_Esperadas_Capa_3.md)
- [9. Circuit Breakers Capa 3](09_9._Circuit_Breakers_Capa_3.md)
- [10. Activación de Capa 3](10_10._Activación_de_Capa_3.md)
- [11. Riesgo de Correlación Triple](11_11._Riesgo_de_Correlación_Triple.md)
- [12. Parámetros Default Capa 3](12_12._Parámetros_Default_Capa_3.md)
- [13. Errores Específicos Capa 3](13_13._Errores_Específicos_Capa_3.md)
- [14. Integración con Otros Módulos](14_14._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/Trend Layer|Trend Layer]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/Cross-Asset|Cross-Asset Crypto & Commodities]]


---

## Notas del módulo

[[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/01_1._Filosofía_y_Diferencias_vs_FX|01_1._Filosofía_y_Diferencias_vs_FX]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/02_2._Universo_de_Instrumentos|02_2._Universo_de_Instrumentos]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/03_3._Mapeo_Driver_Macro_→_Instrumento|03_3._Mapeo_Driver_Macro_→_Instrumento]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/04_4._Construcción_del_Score_para_Equities|04_4._Construcción_del_Score_para_Equities]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/05_5._Position_Sizing_Capa_3|05_5._Position_Sizing_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/06_6._Costes_y_Operativa_Específica|06_6._Costes_y_Operativa_Específica]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/07_7._Pipeline_Capa_3|07_7._Pipeline_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/08_8._Métricas_Esperadas_Capa_3|08_8._Métricas_Esperadas_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/09_9._Circuit_Breakers_Capa_3|09_9._Circuit_Breakers_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/10_10._Activación_de_Capa_3|10_10._Activación_de_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/11_11._Riesgo_de_Correlación_Triple|11_11._Riesgo_de_Correlación_Triple]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/12_12._Parámetros_Default_Capa_3|12_12._Parámetros_Default_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/13_13._Errores_Específicos_Capa_3|13_13._Errores_Específicos_Capa_3]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/14_14._Integración_con_Otros_Módulos|14_14._Integración_con_Otros_Módulos]]
