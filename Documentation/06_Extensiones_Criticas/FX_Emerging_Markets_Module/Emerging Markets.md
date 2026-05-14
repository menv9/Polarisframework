# POLARIS Framework — FX Emerging Markets Module

> **Extensión del marco G10 a divisas emergentes.** EM tiene drivers únicos (riesgo soberano, reservas FX, capital controls, dolarización) que el módulo Endogenous G10 no captura. Los β y filtros se modifican significativamente.
>
> **Filosofía:** EM no es "G10 con más spread". Es un universo con leyes propias: el sentiment global de USD y los flujos de carry pueden dominar sobre toda fundamental local. Modelar EM como G10 lleva a sorpresas catastróficas (Turquía, Argentina precedentes).
>
> **Input:** mismas series macro endo + drivers exo específicos EM (CDS, reservas, EMBI).
> **Output:** Score_FX para divisas EM, ajustado a sus particularidades.

---

## Ãndice de secciones

- [1. Universo y Clasificación](01_1._Universo_y_Clasificación.md)
- [2. Diferencias Estructurales vs G10](02_2._Diferencias_Estructurales_vs_G10.md)
- [3. Drivers Exógenos Específicos por Divisa EM](03_3._Drivers_Exógenos_Específicos_por_Divisa_EM.md)
- [4. Costes y Liquidez EM (Crítico)](04_4._Costes_y_Liquidez_EM_(Crítico).md)
- [5. Position Sizing Específico EM](05_5._Position_Sizing_Específico_EM.md)
- [6. Filtros Específicos EM](06_6._Filtros_Específicos_EM.md)
- [7. Tratamiento de Series No-Estacionarias EM](07_7._Tratamiento_de_Series_No-Estacionarias_EM.md)
- [8. Pipeline EM (modificado)](08_8._Pipeline_EM_(modificado).md)
- [9. Métricas Esperadas EM (más conservadoras)](09_9._Métricas_Esperadas_EM_(más_conservadoras).md)
- [10. Casos Especiales TIER 3 y TIER 4](10_10._Casos_Especiales_TIER_3_y_TIER_4.md)
- [11. NDF (Non-Deliverable Forward) — Operativa](11_11._NDF_(Non-Deliverable_Forward)_—_Operativa.md)
- [12. Activación de EM en el Framework](12_12._Activación_de_EM_en_el_Framework.md)
- [13. Riesgos Específicos EM (no presentes en G10)](13_13._Riesgos_Específicos_EM_(no_presentes_en_G10).md)
- [14. Parámetros Default EM](14_14._Parámetros_Default_EM.md)
- [15. Errores Específicos EM](15_15._Errores_Específicos_EM.md)
- [16. Integración con Otros Módulos](16_16._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[06_Extensiones_Criticas/Scenario_Library_Module/Scenario Library|Scenario Library]]


---

## Notas del módulo

[[06_Extensiones_Criticas/FX_Emerging_Markets_Module/01_1._Universo_y_Clasificación|01_1._Universo_y_Clasificación]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/02_2._Diferencias_Estructurales_vs_G10|02_2._Diferencias_Estructurales_vs_G10]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/03_3._Drivers_Exógenos_Específicos_por_Divisa_EM|03_3._Drivers_Exógenos_Específicos_por_Divisa_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/04_4._Costes_y_Liquidez_EM_(Crítico)|04_4._Costes_y_Liquidez_EM_(Crítico)]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/05_5._Position_Sizing_Específico_EM|05_5._Position_Sizing_Específico_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/06_6._Filtros_Específicos_EM|06_6._Filtros_Específicos_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/07_7._Tratamiento_de_Series_No-Estacionarias_EM|07_7._Tratamiento_de_Series_No-Estacionarias_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/08_8._Pipeline_EM_(modificado)|08_8._Pipeline_EM_(modificado)]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/09_9._Métricas_Esperadas_EM_(más_conservadoras)|09_9._Métricas_Esperadas_EM_(más_conservadoras)]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/10_10._Casos_Especiales_TIER_3_y_TIER_4|10_10._Casos_Especiales_TIER_3_y_TIER_4]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/11_11._NDF_(Non-Deliverable_Forward)_—_Operativa|11_11._NDF_(Non-Deliverable_Forward)_—_Operativa]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/12_12._Activación_de_EM_en_el_Framework|12_12._Activación_de_EM_en_el_Framework]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/13_13._Riesgos_Específicos_EM_(no_presentes_en_G10)|13_13._Riesgos_Específicos_EM_(no_presentes_en_G10)]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/14_14._Parámetros_Default_EM|14_14._Parámetros_Default_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/15_15._Errores_Específicos_EM|15_15._Errores_Específicos_EM]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/16_16._Integración_con_Otros_Módulos|16_16._Integración_con_Otros_Módulos]]
