# POLARIS Framework — FX World View Module

> **Parte I del Framework.** Define el régimen macro global y la dirección estructural del riesgo. Sesga todo el análisis posterior — divisas pro-cíclicas, refugios y EM responden de forma opuesta según el régimen global.
>
> **Filosofía:** la World View no se opera directamente. Filtra y modula el resto. Sin ella, el modelo endógeno puede acertar la dirección por país pero perder en FX porque el régimen global está dominando.
>
> **Input:** datos macro globales (GDP forecasts, índices de riesgo, encuestas, posicionamiento agregado).
> **Output:** régimen global (Risk-ON / Risk-OFF / Mixto), score de momentum macro global, sesgo estructural de USD.

---

## Ãndice de secciones

- [1. Estructura del módulo](01_1._Estructura_del_módulo.md)
- [2. GDP Forecasts y Nowcasts](02_2._GDP_Forecasts_y_Nowcasts.md)
- [3. Régimen Risk-ON Risk-OFF](03_3._Régimen_Risk-ON_Risk-OFF.md)
- [4. Wisdom of the Crowd](04_4._Wisdom_of_the_Crowd.md)
- [5. USD Bias Estructural](05_5._USD_Bias_Estructural.md)
- [6. Régimen de Inflación Global](06_6._Régimen_de_Inflación_Global.md)
- [7. Síntesis World View](07_7._Síntesis_World_View.md)
- [8. Pipeline World View](08_8._Pipeline_World_View.md)
- [9. Frecuencia de actualización](09_9._Frecuencia_de_actualización.md)
- [10. Métricas (output a Self-Awareness)](10_10._Métricas_(output_a_Self-Awareness).md)
- [11. Parámetros Default](11_11._Parámetros_Default.md)
- [12. Limitaciones y Caveats](12_12._Limitaciones_y_Caveats.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]] · [[04_CAPAS_Adicionales/FX_Trend_Layer_Module/Trend Layer|Trend Layer]] · [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/Equities Macro|Equities Macro]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_World_View_Module/01_1._Estructura_del_módulo|01_1._Estructura_del_módulo]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/02_2._GDP_Forecasts_y_Nowcasts|02_2._GDP_Forecasts_y_Nowcasts]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/03_3._Régimen_Risk-ON_Risk-OFF|03_3._Régimen_Risk-ON_Risk-OFF]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/04_4._Wisdom_of_the_Crowd|04_4._Wisdom_of_the_Crowd]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/05_5._USD_Bias_Estructural|05_5._USD_Bias_Estructural]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/06_6._Régimen_de_Inflación_Global|06_6._Régimen_de_Inflación_Global]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/07_7._Síntesis_World_View|07_7._Síntesis_World_View]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/08_8._Pipeline_World_View|08_8._Pipeline_World_View]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/09_9._Frecuencia_de_actualización|09_9._Frecuencia_de_actualización]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/10_10._Métricas_(output_a_Self-Awareness)|10_10._Métricas_(output_a_Self-Awareness)]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/11_11._Parámetros_Default|11_11._Parámetros_Default]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/12_12._Limitaciones_y_Caveats|12_12._Limitaciones_y_Caveats]]
