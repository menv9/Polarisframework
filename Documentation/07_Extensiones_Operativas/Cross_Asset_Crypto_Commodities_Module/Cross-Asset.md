# POLARIS Framework — Cross-Asset Module — Crypto + Commodities

> **Extensión cross-asset del framework macro a Crypto y Commodities directos.** Reutiliza el motor analítico (Score_Endo + Score_Exo + World View) aplicado a nuevos instrumentos con drivers macro propios.
>
> **Filosofía:** crypto y commodities responden a régimen global, USD bias, real rates y narrativas macro de forma distinta a FX/equities. Añadirlos diversifica fuentes de P&L y permite expresar tesis macro con mejor risk-reward en ciertos regímenes.
>
> **Activación:** solo tras Capa 1 G10 + Capa 3 Equities estables (año 4+ del sistema). NO antes.

---

## Ãndice de secciones

- [1. Filosofía y Justificación](01_1._Filosofía_y_Justificación.md)
- [2. Universo de Commodities](02_2._Universo_de_Commodities.md)
- [3. Drivers Macro de Commodities](03_3._Drivers_Macro_de_Commodities.md)
- [4. Particularidades Operativas Commodities](04_4._Particularidades_Operativas_Commodities.md)
- [5. Position Sizing Commodities](05_5._Position_Sizing_Commodities.md)
- [6. Universo Crypto Restringido](06_6._Universo_Crypto_Restringido.md)
- [7. Drivers Macro de Crypto](07_7._Drivers_Macro_de_Crypto.md)
- [8. Particularidades Operativas Crypto](08_8._Particularidades_Operativas_Crypto.md)
- [9. Position Sizing Crypto](09_9._Position_Sizing_Crypto.md)
- [10. Pipeline Cross-Asset Combined](10_10._Pipeline_Cross-Asset_Combined.md)
- [11. Métricas Esperadas](11_11._Métricas_Esperadas.md)
- [12. Circuit Breakers Específicos](12_12._Circuit_Breakers_Específicos.md)
- [13. Activación en el Framework](13_13._Activación_en_el_Framework.md)
- [14. Errores Específicos Cross-Asset](14_14._Errores_Específicos_Cross-Asset.md)
- [15. Parámetros Default Cross-Asset](15_15._Parámetros_Default_Cross-Asset.md)
- [16. Integración con Otros Módulos](16_16._Integración_con_Otros_Módulos.md)
- [17. Conclusión](17_17._Conclusión.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]] · [[03_CAPA_1_FX_Macro/FX_World_View_Module/World View|World View]] · [[03_CAPA_1_FX_Macro/FX_Endogenous_Module/Endógeno|Endogenous]] · [[03_CAPA_1_FX_Macro/FX_Exogenous_Module/Exógeno|Exogenous]]

**Downstream:** [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]

**Relacionados:** [[04_CAPAS_Adicionales/Equities_Macro_Layer_Module/Equities Macro|Equities Macro]] · [[07_Extensiones_Operativas/Multi_Broker_Module/Multi-Broker|Multi-Broker]]


---

## Notas del módulo

[[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/01_1._Filosofía_y_Justificación|01_1._Filosofía_y_Justificación]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/02_2._Universo_de_Commodities|02_2._Universo_de_Commodities]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/03_3._Drivers_Macro_de_Commodities|03_3._Drivers_Macro_de_Commodities]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/04_4._Particularidades_Operativas_Commodities|04_4._Particularidades_Operativas_Commodities]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/05_5._Position_Sizing_Commodities|05_5._Position_Sizing_Commodities]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/06_6._Universo_Crypto_Restringido|06_6._Universo_Crypto_Restringido]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/07_7._Drivers_Macro_de_Crypto|07_7._Drivers_Macro_de_Crypto]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/08_8._Particularidades_Operativas_Crypto|08_8._Particularidades_Operativas_Crypto]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/09_9._Position_Sizing_Crypto|09_9._Position_Sizing_Crypto]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/10_10._Pipeline_Cross-Asset_Combined|10_10._Pipeline_Cross-Asset_Combined]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/11_11._Métricas_Esperadas|11_11._Métricas_Esperadas]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/12_12._Circuit_Breakers_Específicos|12_12._Circuit_Breakers_Específicos]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/13_13._Activación_en_el_Framework|13_13._Activación_en_el_Framework]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/14_14._Errores_Específicos_Cross-Asset|14_14._Errores_Específicos_Cross-Asset]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/15_15._Parámetros_Default_Cross-Asset|15_15._Parámetros_Default_Cross-Asset]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/16_16._Integración_con_Otros_Módulos|16_16._Integración_con_Otros_Módulos]] · [[07_Extensiones_Operativas/Cross_Asset_Crypto_Commodities_Module/17_17._Conclusión|17_17._Conclusión]]
