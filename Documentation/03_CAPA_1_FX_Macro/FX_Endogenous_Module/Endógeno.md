# POLARIS Framework — Endogenous Driver Analysis — Modelo FX Direccional v2

> **Origen:** UK Endo .xlsx (Hoja: gid=1551572167) — scorecard original de sesgo inflacionario por país.
> **Versión actual (v2):** reorientación a **predicción FX direccional** entre dos divisas.
> **Objetivo:** estimar la probabilidad de que la moneda del país A se aprecie frente a la del país B en un horizonte definido.

---

## Ãndice de secciones

- [1. Filosofía del Modelo (v1 → v2)](01_1._Filosofía_del_Modelo_(v1_→_v2).md)
- [2. Arquitectura Diferencial](02_2._Arquitectura_Diferencial.md)
- [3. Scoring Estadístico (Z-scores)](03_3._Scoring_Estadístico_(Z-scores).md)
- [4. Mapeo de Signos FX (Reorientación)](04_4._Mapeo_de_Signos_FX_(Reorientación).md)
- [5. Indicadores Ampliados (Drivers FX Específicos)](05_5._Indicadores_Ampliados_(Drivers_FX_Específicos).md)
- [6. Estratificación por Horizonte](06_6._Estratificación_por_Horizonte.md)
- [7. Filtro de Régimen](07_7._Filtro_de_Régimen.md)
- [8. Indicadores Forward-Looking](08_8._Indicadores_Forward-Looking.md)
- [9. Calibración de Pesos por Regresión](09_9._Calibración_de_Pesos_por_Regresión.md)
- [10. Limpieza de v1](10_10._Limpieza_de_v1.md)
- [11. Plantilla de Replicación FX (Dos Países)](11_11._Plantilla_de_Replicación_FX_(Dos_Países).md)
- [12. Ejemplo End-to-End USD vs EUR (Snapshot Reinterpretado)](12_12._Ejemplo_End-to-End_USD_vs_EUR_(Snapshot_Reinterpretado).md)
- [13. Diagrama de Flujo v2](13_13._Diagrama_de_Flujo_v2.md)
- [14. Glosario](14_14._Glosario.md)
- [15. Implementación Plug-and-Play para G10](15_15._Implementación_Plug-and-Play_para_G10.md)
- [16. Robustez Temporal (Diseño para 10+ Años)](16_16._Robustez_Temporal_(Diseño_para_10+_Años).md)
- [17. Protocolo Anti-Correlación Espuria](17_17._Protocolo_Anti-Correlación_Espuria.md)
- [18. Actualización Dinámica de β](18_18._Actualización_Dinámica_de_β.md)
- [Apéndice A — Matrices de Juicio Experto v1 (Legacy)](19_Apéndice_A_—_Matrices_de_Juicio_Experto_v1_(Legacy).md)
- [Apéndice B — Snapshot Histórico v1 (Anclaje Pedagógico)](20_Apéndice_B_—_Snapshot_Histórico_v1_(Anclaje_Pedagógico).md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]] (combinación) · [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/Emerging Markets|Emerging Markets]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Endogenous_Module/01_1._Filosofía_del_Modelo_(v1_→_v2)|01_1._Filosofía_del_Modelo_(v1_→_v2)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/02_2._Arquitectura_Diferencial|02_2._Arquitectura_Diferencial]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/03_3._Scoring_Estadístico_(Z-scores)|03_3._Scoring_Estadístico_(Z-scores)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/04_4._Mapeo_de_Signos_FX_(Reorientación)|04_4._Mapeo_de_Signos_FX_(Reorientación)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/05_5._Indicadores_Ampliados_(Drivers_FX_Específicos)|05_5._Indicadores_Ampliados_(Drivers_FX_Específicos)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/06_6._Estratificación_por_Horizonte|06_6._Estratificación_por_Horizonte]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/07_7._Filtro_de_Régimen|07_7._Filtro_de_Régimen]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/08_8._Indicadores_Forward-Looking|08_8._Indicadores_Forward-Looking]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/09_9._Calibración_de_Pesos_por_Regresión|09_9._Calibración_de_Pesos_por_Regresión]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/10_10._Limpieza_de_v1|10_10._Limpieza_de_v1]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/11_11._Plantilla_de_Replicación_FX_(Dos_Países)|11_11._Plantilla_de_Replicación_FX_(Dos_Países)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/12_12._Ejemplo_End-to-End_USD_vs_EUR_(Snapshot_Reinterpretado)|12_12._Ejemplo_End-to-End_USD_vs_EUR_(Snapshot_Reinterpretado)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/13_13._Diagrama_de_Flujo_v2|13_13._Diagrama_de_Flujo_v2]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/14_14._Glosario|14_14._Glosario]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/15_15._Implementación_Plug-and-Play_para_G10|15_15._Implementación_Plug-and-Play_para_G10]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/16_16._Robustez_Temporal_(Diseño_para_10+_Años)|16_16._Robustez_Temporal_(Diseño_para_10+_Años)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/17_17._Protocolo_Anti-Correlación_Espuria|17_17._Protocolo_Anti-Correlación_Espuria]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/18_18._Actualización_Dinámica_de_β|18_18._Actualización_Dinámica_de_β]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/19_Apéndice_A_—_Matrices_de_Juicio_Experto_v1_(Legacy)|19_Apéndice_A_—_Matrices_de_Juicio_Experto_v1_(Legacy)]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/20_Apéndice_B_—_Snapshot_Histórico_v1_(Anclaje_Pedagógico)|20_Apéndice_B_—_Snapshot_Histórico_v1_(Anclaje_Pedagógico)]]
