# POLARIS Framework — FX Exogenous Drivers Module

> **Parte II.6 del Framework.** Captura los drivers **externos** al país que afectan a su divisa. Para muchas divisas (especialmente commodity-linked y EM), los drivers exógenos pesan tanto o más que los endógenos.
>
> **Filosofía:** una divisa no flota en el vacío. AUD se mueve con China e mineral de hierro tanto como con datos australianos. CAD con WTI tanto como con BoC. Modelar solo endógeno deja fuera la mitad del cuadro.
>
> **Input:** datos de mercado externos por divisa (commodities, divisas-pivote, tipos US, equity bloque económico).
> **Output:** `Score_FX_Exogenous(país)` que se suma al score endógeno antes de calcular `Señal_FX(A/B)`.

---

## Ãndice de secciones

- [1. Principios](01_1._Principios.md)
- [2. Mapeo Exógeno por Divisa G10](02_2._Mapeo_Exógeno_por_Divisa_G10.md)
- [3. Mapeo Exógeno EM (Resumen)](03_3._Mapeo_Exógeno_EM_(Resumen).md)
- [4. Construcción del Score Exógeno](04_4._Construcción_del_Score_Exógeno.md)
- [5. Indicadores Exógenos Fuentes](05_5._Indicadores_Exógenos_Fuentes.md)
- [6. Casos Especiales](06_6._Casos_Especiales.md)
- [7. Combinación Endo + Exo](07_7._Combinación_Endo_+_Exo.md)
- [8. Pipeline Exogenous](08_8._Pipeline_Exogenous.md)
- [9. Frecuencia de actualización](09_9._Frecuencia_de_actualización.md)
- [10. Métricas de Atribución (Self-Awareness)](10_10._Métricas_de_Atribución_(Self-Awareness).md)
- [11. Limitaciones y Caveats](11_11._Limitaciones_y_Caveats.md)
- [12. Parámetros Default](12_12._Parámetros_Default.md)
- [13. Integración con Otros Módulos](13_13._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/Emerging Markets|Emerging Markets]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Exogenous_Module/01_1._Principios|01_1._Principios]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/02_2._Mapeo_Exógeno_por_Divisa_G10|02_2._Mapeo_Exógeno_por_Divisa_G10]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/03_3._Mapeo_Exógeno_EM_(Resumen)|03_3._Mapeo_Exógeno_EM_(Resumen)]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/04_4._Construcción_del_Score_Exógeno|04_4._Construcción_del_Score_Exógeno]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/05_5._Indicadores_Exógenos_Fuentes|05_5._Indicadores_Exógenos_Fuentes]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/06_6._Casos_Especiales|06_6._Casos_Especiales]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/07_7._Combinación_Endo_+_Exo|07_7._Combinación_Endo_+_Exo]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/08_8._Pipeline_Exogenous|08_8._Pipeline_Exogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/09_9._Frecuencia_de_actualización|09_9._Frecuencia_de_actualización]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/10_10._Métricas_de_Atribución_(Self-Awareness)|10_10._Métricas_de_Atribución_(Self-Awareness)]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/11_11._Limitaciones_y_Caveats|11_11._Limitaciones_y_Caveats]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/12_12._Parámetros_Default|12_12._Parámetros_Default]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/13_13._Integración_con_Otros_Módulos|13_13._Integración_con_Otros_Módulos]]
