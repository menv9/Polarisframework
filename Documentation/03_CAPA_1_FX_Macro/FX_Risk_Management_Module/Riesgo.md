# POLARIS Framework — FX Risk Management Module

> **Parte V del Framework.** Define cuánto arriesgar por trade y a nivel portfolio, qué stops usar, cómo dimensionar posiciones y cuándo parar.
>
> **Filosofía:** sin esta capa, el mejor sistema predictivo va a cero por ruina estadística. Position sizing y stops son **no-negociables**, no parámetros opcionales.
>
> **Input:** `Señal_FX(A/B)` del módulo endógeno (§II.5) + datos de mercado (vol, precio, posiciones abiertas).
> **Output:** tamaño de posición, niveles de stop/target, decisión de continuar/reducir/parar operativa.

---

## Ãndice de secciones

- [1. Principios Fundamentales](01_1._Principios_Fundamentales.md)
- [2. Volatility Assessment (§15 del Framework)](02_2._Volatility_Assessment_(§15_del_Framework).md)
- [3. Position Sizing (§16 del Framework)](03_3._Position_Sizing_(§16_del_Framework).md)
- [4. Stops y Exits (§17 del Framework)](04_4._Stops_y_Exits_(§17_del_Framework).md)
- [5. Portfolio Risk (§18 del Framework)](05_5._Portfolio_Risk_(§18_del_Framework).md)
- [6. Drawdown Protocols Circuit Breakers (§19 del Framework)](06_6._Drawdown_Protocols_Circuit_Breakers_(§19_del_Framework).md)
- [7. Integración con el Módulo Endógeno](07_7._Integración_con_el_Módulo_Endógeno.md)
- [8. Checklist Pre-Trade (Obligatorio)](08_8._Checklist_Pre-Trade_(Obligatorio).md)
- [9. Parámetros Default (Resumen)](09_9._Parámetros_Default_(Resumen).md)
- [10. Métricas que esta Capa Debe Producir](10_10._Métricas_que_esta_Capa_Debe_Producir.md)
- [11. Arranque del Sistema — Capital Ramp-up](11_11._Arranque_del_Sistema_—_Capital_Ramp-up.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[07_Extensiones_Operativas/Disaster_Recovery_Module/Disaster Recovery|Disaster Recovery]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/01_1._Principios_Fundamentales|01_1._Principios_Fundamentales]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/02_2._Volatility_Assessment_(§15_del_Framework)|02_2._Volatility_Assessment_(§15_del_Framework)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/03_3._Position_Sizing_(§16_del_Framework)|03_3._Position_Sizing_(§16_del_Framework)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/04_4._Stops_y_Exits_(§17_del_Framework)|04_4._Stops_y_Exits_(§17_del_Framework)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/05_5._Portfolio_Risk_(§18_del_Framework)|05_5._Portfolio_Risk_(§18_del_Framework)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/06_6._Drawdown_Protocols_Circuit_Breakers_(§19_del_Framework)|06_6._Drawdown_Protocols_Circuit_Breakers_(§19_del_Framework)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/07_7._Integración_con_el_Módulo_Endógeno|07_7._Integración_con_el_Módulo_Endógeno]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/08_8._Checklist_Pre-Trade_(Obligatorio)|08_8._Checklist_Pre-Trade_(Obligatorio)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/09_9._Parámetros_Default_(Resumen)|09_9._Parámetros_Default_(Resumen)]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/10_10._Métricas_que_esta_Capa_Debe_Producir|10_10._Métricas_que_esta_Capa_Debe_Producir]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/11_11._Arranque_del_Sistema_—_Capital_Ramp-up|11_11._Arranque_del_Sistema_—_Capital_Ramp-up]]
