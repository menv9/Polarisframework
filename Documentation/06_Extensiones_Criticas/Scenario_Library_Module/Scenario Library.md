# POLARIS Framework — Historical Scenario Library Module

> **Biblioteca de escenarios históricos** documentados en detalle. Para cada evento crítico desde 2008: contexto, comportamiento de drivers, qué habría hecho el sistema, qué circuit breakers habrían disparado, lecciones aprendidas.
>
> **Filosofía:** un sistema dice que sobrevive 10 años. Probarlo no requiere esperar 10 años — requiere simularlo contra los 10-15 eventos más relevantes ya ocurridos. Si el sistema "habría parado a tiempo" en Lehman, "habría ganado" en risk-off 2020, "habría sobrevivido" SNB 2015, entonces hay base para confianza. Si no, hay que rediseñar antes de poner dinero real.
>
> **Uso:** validación cualitativa del sistema antes de live trading + entrenamiento del operador.

---

## Ãndice de secciones

- [1. Para qué sirve esta biblioteca](01_1._Para_qué_sirve_esta_biblioteca.md)
- [2. Escenario 1 — Lehman GFC (Sep-Dec 2008)](02_2._Escenario_1_—_Lehman_GFC_(Sep-Dec_2008).md)
- [3. Escenario 2 — European Sovereign Debt Crisis (2010-2012)](03_3._Escenario_2_—_European_Sovereign_Debt_Crisis_(2010-2012).md)
- [4. Escenario 3 — Taper Tantrum (May-Sep 2013)](04_4._Escenario_3_—_Taper_Tantrum_(May-Sep_2013).md)
- [5. Escenario 4 — SNB Cap Removal (Jan 15, 2015)](05_5._Escenario_4_—_SNB_Cap_Removal_(Jan_15,_2015).md)
- [6. Escenario 5 — China Devaluation (Aug 2015)](06_6._Escenario_5_—_China_Devaluation_(Aug_2015).md)
- [7. Escenario 6 — Brexit Referendum (Jun 24, 2016)](07_7._Escenario_6_—_Brexit_Referendum_(Jun_24,_2016).md)
- [8. Escenario 7 — VIX Spike Volmageddon (Feb 5, 2018)](08_8._Escenario_7_—_VIX_Spike_Volmageddon_(Feb_5,_2018).md)
- [9. Escenario 8 — EM Crisis (2018 Turkey, Argentina)](09_9._Escenario_8_—_EM_Crisis_(2018_Turkey,_Argentina).md)
- [10. Escenario 9 — COVID-19 Pandemic (Feb-Apr 2020)](10_10._Escenario_9_—_COVID-19_Pandemic_(Feb-Apr_2020).md)
- [11. Escenario 10 — RussiaUkraine + Inflation Shock (2022)](11_11._Escenario_10_-_RussiaUkraine_Inflation_(2022).md)
- [12. Escenario 11 — SVB Banking Crisis (Mar 2023)](12_12._Escenario_11_—_SVB_Banking_Crisis_(Mar_2023).md)
- [13. Escenario 12 — Inverted Yield Curve Recession Watch (2022-2024)](13_13._Escenario_12_-_Inverted_Yield_Curve_(2022-2024).md)
- [14. Escenarios Hipotéticos Stress Tests](14_14._Escenarios_Hipotéticos_Stress_Tests.md)
- [15. Aplicación al Sistema](15_15._Aplicación_al_Sistema.md)
- [16. Cómo Añadir Nuevos Escenarios](16_16._Cómo_Añadir_Nuevos_Escenarios.md)
- [17. Patrones Recurrentes (Meta-lecciones)](17_17._Patrones_Recurrentes_(Meta-lecciones).md)
- [18. Lista Completa de Escenarios Documentados](18_18._Lista_Completa_de_Escenarios_Documentados.md)
- [19. Integración con Otros Módulos](19_19._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]]

**Relacionados:** *Todos los módulos (validación)* · [[08_Meta_Documentos/System_Weaknesses/Weaknesses|System Weaknesses]] · [[06_Extensiones_Criticas/FX_Emerging_Markets_Module/Emerging Markets|Emerging Markets]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]


---

## Notas del módulo

[[06_Extensiones_Criticas/Scenario_Library_Module/01_1._Para_qué_sirve_esta_biblioteca|01_1._Para_qué_sirve_esta_biblioteca]] · [[06_Extensiones_Criticas/Scenario_Library_Module/02_2._Escenario_1_—_Lehman_GFC_(Sep-Dec_2008)|02_2._Escenario_1_—_Lehman_GFC_(Sep-Dec_2008)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/03_3._Escenario_2_—_European_Sovereign_Debt_Crisis_(2010-2012)|03_3._Escenario_2_—_European_Sovereign_Debt_Crisis_(2010-2012)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/04_4._Escenario_3_—_Taper_Tantrum_(May-Sep_2013)|04_4._Escenario_3_—_Taper_Tantrum_(May-Sep_2013)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/05_5._Escenario_4_—_SNB_Cap_Removal_(Jan_15,_2015)|05_5._Escenario_4_—_SNB_Cap_Removal_(Jan_15,_2015)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/06_6._Escenario_5_—_China_Devaluation_(Aug_2015)|06_6._Escenario_5_—_China_Devaluation_(Aug_2015)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/07_7._Escenario_6_—_Brexit_Referendum_(Jun_24,_2016)|07_7._Escenario_6_—_Brexit_Referendum_(Jun_24,_2016)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/08_8._Escenario_7_—_VIX_Spike_Volmageddon_(Feb_5,_2018)|08_8._Escenario_7_—_VIX_Spike_Volmageddon_(Feb_5,_2018)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/09_9._Escenario_8_—_EM_Crisis_(2018_Turkey,_Argentina)|09_9._Escenario_8_—_EM_Crisis_(2018_Turkey,_Argentina)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/10_10._Escenario_9_—_COVID-19_Pandemic_(Feb-Apr_2020)|10_10._Escenario_9_—_COVID-19_Pandemic_(Feb-Apr_2020)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/11_11._Escenario_10_-_RussiaUkraine_Inflation_(2022)|11_11._Escenario_10_-_RussiaUkraine_Inflation_(2022)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/12_12._Escenario_11_—_SVB_Banking_Crisis_(Mar_2023)|12_12._Escenario_11_—_SVB_Banking_Crisis_(Mar_2023)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/13_13._Escenario_12_-_Inverted_Yield_Curve_(2022-2024)|13_13._Escenario_12_-_Inverted_Yield_Curve_(2022-2024)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/14_14._Escenarios_Hipotéticos_Stress_Tests|14_14._Escenarios_Hipotéticos_Stress_Tests]] · [[06_Extensiones_Criticas/Scenario_Library_Module/15_15._Aplicación_al_Sistema|15_15._Aplicación_al_Sistema]] · [[06_Extensiones_Criticas/Scenario_Library_Module/16_16._Cómo_Añadir_Nuevos_Escenarios|16_16._Cómo_Añadir_Nuevos_Escenarios]] · [[06_Extensiones_Criticas/Scenario_Library_Module/17_17._Patrones_Recurrentes_(Meta-lecciones)|17_17._Patrones_Recurrentes_(Meta-lecciones)]] · [[06_Extensiones_Criticas/Scenario_Library_Module/18_18._Lista_Completa_de_Escenarios_Documentados|18_18._Lista_Completa_de_Escenarios_Documentados]] · [[06_Extensiones_Criticas/Scenario_Library_Module/19_19._Integración_con_Otros_Módulos|19_19._Integración_con_Otros_Módulos]]
