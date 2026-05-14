# POLARIS Framework — FX Self-Awareness Statistics Module

> **Parte VI del Framework.** Cierra el bucle de feedback. Mide si el sistema funciona, por qué, y qué mejorar. Sin este módulo, el resto son hipótesis sin validar.
>
> **Filosofía:** lo que no se mide no mejora. Lo que se mide sin disciplina decae igualmente. Este módulo combina métricas cuantitativas duras (P&L, Sharpe, drawdowns) con métricas de proceso (hit rate, atribución por bloque) y cualitativas (trade journal). El sistema aprende de su propia operativa.
>
> **Input:** todos los outputs de los módulos anteriores — trades ejecutados, costes, slippage, atribución por driver.
> **Output:** dashboard de salud del sistema, decisiones de recalibración, parar/continuar operativa, ajustar pesos.

---

## Ãndice de secciones

- [1. Estructura del módulo](01_1._Estructura_del_módulo.md)
- [2. Métricas de P&L (§20)](02_2._Métricas_de_P&L_(§20).md)
- [3. Métricas de Proceso (§21)](03_3._Métricas_de_Proceso_(§21).md)
- [4. Performance Attribution (§22)](04_4._Performance_Attribution_(§22).md)
- [5. Análisis de Drawdowns](05_5._Análisis_de_Drawdowns.md)
- [6. Trade Journal (§23)](06_6._Trade_Journal_(§23).md)
- [7. Post-Mortem Protocols](07_7._Post-Mortem_Protocols.md)
- [8. Decisiones del Sistema](08_8._Decisiones_del_Sistema.md)
- [9. Dashboard Operativo Diario](09_9._Dashboard_Operativo_Diario.md)
- [10. Protocolo de Mejora Continua (§24)](10_10._Protocolo_de_Mejora_Continua_(§24).md)
- [11. Métricas Cuantitativas Avanzadas (Opcionales)](11_11._Métricas_Cuantitativas_Avanzadas_(Opcionales).md)
- [12. Integración con Otros Módulos](12_12._Integración_con_Otros_Módulos.md)
- [13. Checklist de Salud del Sistema (mensual)](13_13._Checklist_de_Salud_del_Sistema_(mensual).md)
- [14. Parámetros Default](14_14._Parámetros_Default.md)
- [15. Limitaciones del Módulo](15_15._Limitaciones_del_Módulo.md)
- [16. Conclusión el Bucle Completo](16_16._Conclusión_el_Bucle_Completo.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · *Todos los módulos (feedback loop)*

**Downstream:** *Feedback a todos los módulos*

**Relacionados:** [[08_Meta_Documentos/System_Weaknesses/Weaknesses|System Weaknesses]] · [[07_Extensiones_Operativas/Behavioral_Finance_Module/Behavioral Finance|Behavioral Finance]] · [[06_Extensiones_Criticas/Scenario_Library_Module/Scenario Library|Scenario Library]]


---

## Notas del módulo

[[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/01_1._Estructura_del_módulo|01_1._Estructura_del_módulo]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/02_2._Métricas_de_P&L_(§20)|02_2._Métricas_de_P&L_(§20)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/03_3._Métricas_de_Proceso_(§21)|03_3._Métricas_de_Proceso_(§21)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/04_4._Performance_Attribution_(§22)|04_4._Performance_Attribution_(§22)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/05_5._Análisis_de_Drawdowns|05_5._Análisis_de_Drawdowns]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/06_6._Trade_Journal_(§23)|06_6._Trade_Journal_(§23)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/07_7._Post-Mortem_Protocols|07_7._Post-Mortem_Protocols]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/08_8._Decisiones_del_Sistema|08_8._Decisiones_del_Sistema]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/09_9._Dashboard_Operativo_Diario|09_9._Dashboard_Operativo_Diario]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/10_10._Protocolo_de_Mejora_Continua_(§24)|10_10._Protocolo_de_Mejora_Continua_(§24)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/11_11._Métricas_Cuantitativas_Avanzadas_(Opcionales)|11_11._Métricas_Cuantitativas_Avanzadas_(Opcionales)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/12_12._Integración_con_Otros_Módulos|12_12._Integración_con_Otros_Módulos]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/13_13._Checklist_de_Salud_del_Sistema_(mensual)|13_13._Checklist_de_Salud_del_Sistema_(mensual)]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/14_14._Parámetros_Default|14_14._Parámetros_Default]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/15_15._Limitaciones_del_Módulo|15_15._Limitaciones_del_Módulo]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/16_16._Conclusión_el_Bucle_Completo|16_16._Conclusión_el_Bucle_Completo]]
