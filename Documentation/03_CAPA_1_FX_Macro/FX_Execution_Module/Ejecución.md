# POLARIS Framework — FX Execution & Costs Module

> **Parte IV del Framework.** Define cómo se materializa una decisión de trading en una orden real, qué costes se aplican y cómo asegurar que el P&L bruto del modelo sobreviva a la realidad.
>
> **Filosofía:** una señal con edge teórico de 50 bps/mes muere por costes en pares EM y por mala ejecución incluso en G10. El P&L que importa es **neto**: gross − spread − swap − slippage − comisiones − impuestos.
>
> **Input:** trade ejecutable del módulo Risk Management (size, entry, stop, target, plazo).
> **Output:** orden enviada al broker con timing, tipo y parámetros óptimos. Métrica de coste real por trade.

---

## Ãndice de secciones

- [1. Taxonomía de Costes](01_1._Taxonomía_de_Costes.md)
- [2. Costes por Par G10 (Referencia)](02_2._Costes_por_Par_G10_(Referencia).md)
- [3. Reglas de Entrada (§13a)](03_3._Reglas_de_Entrada_(§13a).md)
- [4. Reglas de Salida (§13b)](04_4._Reglas_de_Salida_(§13b).md)
- [5. Order Types](05_5._Order_Types.md)
- [6. Broker, Venue y Settlement (§14)](06_6._Broker,_Venue_y_Settlement_(§14).md)
- [7. Slippage Management](07_7._Slippage_Management.md)
- [8. Calendario de Eventos Blackouts](08_8._Calendario_de_Eventos_Blackouts.md)
- [9. Pipeline de Ejecución End-to-End](09_9._Pipeline_de_Ejecución_End-to-End.md)
- [10. Métricas de Ejecución (output)](10_10._Métricas_de_Ejecución_(output).md)
- [11. Checklist Pre-Ejecución](11_11._Checklist_Pre-Ejecución.md)
- [12. Parámetros Default](12_12._Parámetros_Default.md)
- [13. Casos Especiales](13_13._Casos_Especiales.md)
- [14. Integración con Otros Módulos](14_14._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Timing_Module/Timing|Timing]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[07_Extensiones_Operativas/Multi_Broker_Module/Multi-Broker|Multi-Broker]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/Fiscal|Fiscal]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Execution_Module/01_1._Taxonomía_de_Costes|01_1._Taxonomía_de_Costes]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/02_2._Costes_por_Par_G10_(Referencia)|02_2._Costes_por_Par_G10_(Referencia)]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/03_3._Reglas_de_Entrada_(§13a)|03_3._Reglas_de_Entrada_(§13a)]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/04_4._Reglas_de_Salida_(§13b)|04_4._Reglas_de_Salida_(§13b)]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/05_5._Order_Types|05_5._Order_Types]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/06_6._Broker,_Venue_y_Settlement_(§14)|06_6._Broker,_Venue_y_Settlement_(§14)]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/07_7._Slippage_Management|07_7._Slippage_Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/08_8._Calendario_de_Eventos_Blackouts|08_8._Calendario_de_Eventos_Blackouts]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/09_9._Pipeline_de_Ejecución_End-to-End|09_9._Pipeline_de_Ejecución_End-to-End]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/10_10._Métricas_de_Ejecución_(output)|10_10._Métricas_de_Ejecución_(output)]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/11_11._Checklist_Pre-Ejecución|11_11._Checklist_Pre-Ejecución]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/12_12._Parámetros_Default|12_12._Parámetros_Default]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/13_13._Casos_Especiales|13_13._Casos_Especiales]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/14_14._Integración_con_Otros_Módulos|14_14._Integración_con_Otros_Módulos]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/README|README]]
