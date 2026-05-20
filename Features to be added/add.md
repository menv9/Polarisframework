Qué falta por añadir — de más rápido a más lento
Nivel 1 — Rápido (1–2h cada uno)
Son los 11 módulos que usan BriefExtensionModulePage: solo muestran una descripción de dos líneas. Ya tienes el patrón de G10/G11 en LayerModulePage.jsx para hacer algo sólido.

Módulo	Ruta
G12 Macro Nowcasting	/macro-nowcasting
G9 Behavioral Finance	/behavioral-finance
G16 Decision Log	/decision-log
G17 Knowledge Transfer	/knowledge-transfer
G3 Modulo Fiscal	/fiscal
G6 Disaster Recovery	/disaster-recovery
G7 Tail Risk	/tail-risk
G8 Counterparty Risk	/counterparty-risk
G13 Multi-Broker	/multi-broker
G15 Model Governance	/model-governance
G18 External Validation	/external-validation
El patrón a seguir: sacar el contenido de la documentación del framework (igual que hiciste con G10 y G11) y presentarlo con las secciones del LayerModulePage: principio central, pipeline, parámetros, circuit breakers, errores.

Nivel 2 — Medio (medio día cada uno)
Páginas con componente propio pero que probablemente son stubs o tienen contenido mínimo:

/general — "País en una pantalla": requiere diseño de layout con todos los módulos resumidos para un par/país
/backtest — estructura de formulario + tabla de resultados
/scenario-library — CRUD de escenarios almacenados
/capital-allocation — tabla de asignación con reglas del framework
Nivel 3 — Lento (1+ días)
Páginas que requieren diseño de UX propio + integración de datos real:

/journal — entrada de trades, editor de notas, tags por módulo
/performance — métricas P&L, Sharpe, attribution por módulo, gráficas
/trade — Global Trade Monitor, datos externos
Nivel 4 — Proyecto largo
Integración de datos en vivo en las páginas operativas (WorldView, Endogenous, Exogenous, Timing, Risk): ahora todas usan datos estáticos o mock
Autenticación real (ahora es stub)
Backend / data pipeline conectado a las páginas /data/*

quiero que me elimines lo de que pone G__ y a partir de ahora cuando cambies una pagina para anadirle cosas de la lista que me has pasado antes, quiero que quites la G__ asi sabre que los que tienen G estan por hacer todavia