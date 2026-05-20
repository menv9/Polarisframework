Resumen rápido de lo que falta tras implementar EM
🔴 CRÍTICO (bloqueante para operar dinero real)
ID	Gap	Estado
G5	Integración automática del pipeline	Pipeline genera CSVs; carga manual via drag-and-drop. Punto de fricción máximo.
G3	Módulo Fiscal / Tax España	Documentado en 7 archivos. CFDs/futuros, Modelo 720, compensación pérdidas, vehículos SL/SCR/EAFI. Hasta 47% del P&L.
#35	9 indicadores endógenos faltantes	NMI, Building Permits, M2, PPI, Core PPI, Fiscal Balance, Interest/GDP, Liquidity, Breakevens. Renormalización compensa matemáticamente si no hay fuentes.
🟠 ALTO (robustez y riesgo operativo)
ID	Gap
G6	Disaster Recovery / Business Continuity
G7	Hedging / Tail Risk Module
G8	Counterparty Risk Framework
G9	Behavioral Finance / Psicología del operador
G10	Capa 2 — FX Trend Layer (13 archivos, proyecto de meses)
G11	Capa 3 — Equities Macro Layer (14 archivos, proyecto de meses)
🟡 MEDIO (extensiones útiles)
ID	Gap
G12	Macro Nowcasting Avanzado
G13	Multi-Broker / Multi-Account Management
🟢 BAJO (gobernanza)
ID	Gap
G15	Model Governance / Audit Trail
G16	Decision Log estratégico
G17	Knowledge Transfer Protocol
G18	External Validation Framework
⚠️ Limitaciones técnicas actuales
1. 
Sin backend persistente — Todo en localStorage. Bloqueante para multi-usuario.
2. 
Pipeline desconectado — beta_pipeline/ es independiente, no alimenta la app automáticamente.
3. 
Tests — Solo 4 tests de renderizado. Falta cobertura de scoring, sizing y utilidades.
🎯 Orden recomendado ahora
Prioridad	Tarea	Por qué
1	G5: Automatizar carga del pipeline	Mayor fricción operativa hoy
2	G3: Fiscal España básico	Impacto directo en P&L neto si declaras
3	#35: Indicadores	Solo si encuentras fuentes de calidad
4	G10/G11: Capa 2 y Capa 3	Proyectos de meses cada uno
5	G6–G9: DR, Hedging, Counterparty, Behavioral	Risk operativo