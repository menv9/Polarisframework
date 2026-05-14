# POLARIS Framework — Multi-Broker Management Module

> **Gestión de múltiples brokers** simultáneamente. Necesario cuando: (a) capital > 100k y quieres diversificar contraparte, (b) operativa requiere brokers especializados (FX + equities + crypto + futuros), (c) fragmentación táctica del riesgo.
>
> **Filosofía:** un solo broker para todo es simple pero concentra riesgo. Múltiples brokers diversifican contraparte pero requieren sistema de gestión unificada. Sin este módulo, multi-broker = caos operativo y tracking propenso a error.

---

## Ãndice de secciones

- [1. ¿Cuándo usar multi-broker](01_1._¿Cuándo_usar_multi-broker.md)
- [2. Setups Recomendados por Tamaño](02_2._Setups_Recomendados_por_Tamaño.md)
- [3. Asignación de Capital entre Brokers](03_3._Asignación_de_Capital_entre_Brokers.md)
- [4. Tracking Unificado de Exposición](04_4._Tracking_Unificado_de_Exposición.md)
- [5. FX entre Cuentas (Costes Ocultos)](05_5._FX_entre_Cuentas_(Costes_Ocultos).md)
- [6. Margen y Apalancamiento entre Brokers](06_6._Margen_y_Apalancamiento_entre_Brokers.md)
- [7. Aspectos Fiscales Multi-Broker](07_7._Aspectos_Fiscales_Multi-Broker.md)
- [8. Failover Operativo](08_8._Failover_Operativo.md)
- [9. Operativa Diaria Multi-Broker](09_9._Operativa_Diaria_Multi-Broker.md)
- [10. Errores Específicos Multi-Broker](10_10._Errores_Específicos_Multi-Broker.md)
- [11. Checklist Setup Multi-Broker](11_11._Checklist_Setup_Multi-Broker.md)
- [12. Parámetros Default Multi-Broker](12_12._Parámetros_Default_Multi-Broker.md)
- [13. Resumen Operativo](13_13._Resumen_Operativo.md)
- [14. Integración con Otros Módulos](14_14._Integración_con_Otros_Módulos.md)

---

## 🔗 Relaciones del Módulo

**Upstream:** [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]] · [[02_FX_Framework_Schema/FX_Framework_Schema/Schema|Framework Schema]]

**Relacionados:** [[03_CAPA_1_FX_Macro/FX_Execution_Module/Ejecución|Execution]] · [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|Risk Management]] · [[06_Extensiones_Criticas/Tax_Fiscal_Module/Fiscal|Fiscal]] · [[07_Extensiones_Operativas/Disaster_Recovery_Module/Disaster Recovery|Disaster Recovery]]


---

## Notas del módulo

[[07_Extensiones_Operativas/Multi_Broker_Module/01_1._¿Cuándo_usar_multi-broker|01_1._¿Cuándo_usar_multi-broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/02_2._Setups_Recomendados_por_Tamaño|02_2._Setups_Recomendados_por_Tamaño]] · [[07_Extensiones_Operativas/Multi_Broker_Module/03_3._Asignación_de_Capital_entre_Brokers|03_3._Asignación_de_Capital_entre_Brokers]] · [[07_Extensiones_Operativas/Multi_Broker_Module/04_4._Tracking_Unificado_de_Exposición|04_4._Tracking_Unificado_de_Exposición]] · [[07_Extensiones_Operativas/Multi_Broker_Module/05_5._FX_entre_Cuentas_(Costes_Ocultos)|05_5._FX_entre_Cuentas_(Costes_Ocultos)]] · [[07_Extensiones_Operativas/Multi_Broker_Module/06_6._Margen_y_Apalancamiento_entre_Brokers|06_6._Margen_y_Apalancamiento_entre_Brokers]] · [[07_Extensiones_Operativas/Multi_Broker_Module/07_7._Aspectos_Fiscales_Multi-Broker|07_7._Aspectos_Fiscales_Multi-Broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/08_8._Failover_Operativo|08_8._Failover_Operativo]] · [[07_Extensiones_Operativas/Multi_Broker_Module/09_9._Operativa_Diaria_Multi-Broker|09_9._Operativa_Diaria_Multi-Broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/10_10._Errores_Específicos_Multi-Broker|10_10._Errores_Específicos_Multi-Broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/11_11._Checklist_Setup_Multi-Broker|11_11._Checklist_Setup_Multi-Broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/12_12._Parámetros_Default_Multi-Broker|12_12._Parámetros_Default_Multi-Broker]] · [[07_Extensiones_Operativas/Multi_Broker_Module/13_13._Resumen_Operativo|13_13._Resumen_Operativo]] · [[07_Extensiones_Operativas/Multi_Broker_Module/14_14._Integración_con_Otros_Módulos|14_14._Integración_con_Otros_Módulos]]
