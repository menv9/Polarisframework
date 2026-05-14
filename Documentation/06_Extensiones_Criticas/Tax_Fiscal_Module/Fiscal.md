# POLARIS Framework — Tax & Fiscal Module

> **Módulo de tratamiento fiscal del sistema.** El P&L bruto del backtest dista mucho del P&L neto-after-tax. En España, el fiscal puede ser **19-47% del P&L**, lo que reduce un Sharpe 1.0 bruto a un Sharpe 0.6-0.7 neto. Sin modelar fiscal, las decisiones de sizing y horizonte están mal optimizadas.
>
> **DISCLAIMER LEGAL:** Este documento es información general orientativa, **NO asesoramiento fiscal**. La fiscalidad es compleja y específica al caso. Antes de operar a tamaño material, **consultar un fiscalista** especializado en mercados financieros con conocimiento de la jurisdicción aplicable. Las normas cambian; verificar vigencia.
>
> **Foco principal:** España (residente fiscal). Referencias a UK y US para contexto.

---

## Ãndice de secciones

- [1. Por qué importa el fiscal](01_1._Por_qué_importa_el_fiscal.md)
- [2. España — Marco General (Residente Fiscal)](02_2._España_—_Marco_General_(Residente_Fiscal).md)
- [3. Compensación de Pérdidas y Ganancias](03_3._Compensación_de_Pérdidas_y_Ganancias.md)
- [4. Modelo 720 — Declaración de Bienes en el Extranjero](04_4._Modelo_720_—_Declaración_de_Bienes_en_el_Extranjero.md)
- [5. Vehículos Operativos en España](05_5._Vehículos_Operativos_en_España.md)
- [6. UK — Marco para Referencia (Si Planeas Mover Residencia)](06_6._UK_—_Marco_para_Referencia_(Si_Planeas_Mover_Residencia).md)
- [7. US — Referencia (Para Contexto Internacional)](07_7._US_—_Referencia_(Para_Contexto_Internacional).md)
- [8. Optimización Fiscal Operativa](08_8._Optimización_Fiscal_Operativa.md)
- [9. Consideración Crítica Brokers Españoles vs Extranjeros](09_9._Consideración_Crítica_Brokers_Españoles_vs_Extranjeros.md)
- [10. Cómo el Fiscal Modifica Decisiones Sistemáticas](10_10._Cómo_el_Fiscal_Modifica_Decisiones_Sistemáticas.md)
- [11. Documentación Mínima por Trade (Para Fiscal)](11_11._Documentación_Mínima_por_Trade_(Para_Fiscal).md)
- [12. Asesor Fiscal — Cuándo y Cómo Contratar](12_12._Asesor_Fiscal_—_Cuándo_y_Cómo_Contratar.md)
- [13. Casos Especiales](13_13._Casos_Especiales.md)
- [14. Integración con Métricas del Sistema](14_14._Integración_con_Métricas_del_Sistema.md)
- [15. Checklist Fiscal Anual](15_15._Checklist_Fiscal_Anual.md)
- [16. Errores Fiscales Comunes a Evitar](16_16._Errores_Fiscales_Comunes_a_Evitar.md)
- [17. Resumen Operativo](17_17._Resumen_Operativo.md)
- [18. DISCLAIMER FINAL](18_18._DISCLAIMER_FINAL.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[07_Extensiones_Operativas/Multi_Broker_Module/Multi-Broker|Multi-Broker]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|Self-Awareness]]


---

## Notas del módulo

[[06_Extensiones_Criticas/Tax_Fiscal_Module/01_1._Por_qué_importa_el_fiscal|01_1._Por_qué_importa_el_fiscal]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/02_2._España_—_Marco_General_(Residente_Fiscal)|02_2._España_—_Marco_General_(Residente_Fiscal)]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/03_3._Compensación_de_Pérdidas_y_Ganancias|03_3._Compensación_de_Pérdidas_y_Ganancias]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/04_4._Modelo_720_—_Declaración_de_Bienes_en_el_Extranjero|04_4._Modelo_720_—_Declaración_de_Bienes_en_el_Extranjero]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/05_5._Vehículos_Operativos_en_España|05_5._Vehículos_Operativos_en_España]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/06_6._UK_—_Marco_para_Referencia_(Si_Planeas_Mover_Residencia)|06_6._UK_—_Marco_para_Referencia_(Si_Planeas_Mover_Residencia)]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/07_7._US_—_Referencia_(Para_Contexto_Internacional)|07_7._US_—_Referencia_(Para_Contexto_Internacional)]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/08_8._Optimización_Fiscal_Operativa|08_8._Optimización_Fiscal_Operativa]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/09_9._Consideración_Crítica_Brokers_Españoles_vs_Extranjeros|09_9._Consideración_Crítica_Brokers_Españoles_vs_Extranjeros]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/10_10._Cómo_el_Fiscal_Modifica_Decisiones_Sistemáticas|10_10._Cómo_el_Fiscal_Modifica_Decisiones_Sistemáticas]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/11_11._Documentación_Mínima_por_Trade_(Para_Fiscal)|11_11._Documentación_Mínima_por_Trade_(Para_Fiscal)]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/12_12._Asesor_Fiscal_—_Cuándo_y_Cómo_Contratar|12_12._Asesor_Fiscal_—_Cuándo_y_Cómo_Contratar]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/13_13._Casos_Especiales|13_13._Casos_Especiales]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/14_14._Integración_con_Métricas_del_Sistema|14_14._Integración_con_Métricas_del_Sistema]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/15_15._Checklist_Fiscal_Anual|15_15._Checklist_Fiscal_Anual]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/16_16._Errores_Fiscales_Comunes_a_Evitar|16_16._Errores_Fiscales_Comunes_a_Evitar]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/17_17._Resumen_Operativo|17_17._Resumen_Operativo]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/18_18._DISCLAIMER_FINAL|18_18._DISCLAIMER_FINAL]]
