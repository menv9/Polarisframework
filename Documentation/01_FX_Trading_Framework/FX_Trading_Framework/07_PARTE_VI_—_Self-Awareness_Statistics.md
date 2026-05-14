## PARTE VI — Self-Awareness Statistics

> **Pregunta que responde:** ¿Está funcionando? ¿Por qué? ¿Qué cambiar?

El bucle de feedback. Sin §VI, las §I-V son hipótesis sin validar. Con §VI, el sistema aprende.

### §20. Métricas de P&L
*[Por desarrollar]* 
- **Sharpe ratio:** retorno anualizado / vol anualizada. Target > 1.0 OOS.
- **Sortino ratio:** Sharpe usando solo vol bajista. Target > 1.5.
- **Calmar ratio:** retorno anualizado / max drawdown. Target > 0.5.
- **Max drawdown:** peor pico-a-valle.
- **Recovery time:** cuánto tarda en recuperar drawdown.

### §21. Métricas de Proceso
*[Por desarrollar]*
- **Hit rate** (% trades ganadores). Target > 50% (con asimetría G/P puede ser menor).
- **Profit factor** (suma G / suma P). Target > 1.5.
- **Average win / Average loss** (asimetría). Target > 1.5.
- **Information Coefficient** (correlación señal vs retorno futuro). Target > 0.05.
- **Kelly criterion** (cálculo ex-post): `f* = p − q/b`.

### §22. Performance Attribution
*[Por desarrollar]* Descomponer P&L por bloque del modelo:
- ¿Qué % del P&L viene del bloque "tipos reales 2Y"? ¿Y de "REER"? ¿Y de "Timing técnico"?
- Si un bloque genera P&L negativo consistente → eliminar o re-pesar.
- Si Timing añade alfa sobre la señal pura → confirmado, mantener. Si resta → quitar.

### §23. Trade Journal y Post-Mortem
*[Por desarrollar]* Por cada trade: razón de entrada (qué señal), expectativa (target, plazo, R), resultado, lección. Post-mortem **mensual** (qué funcionó/qué no) y **trimestral** (cambios al sistema).

### §24. Protocolo de Mejora Continua
*[Por desarrollar]*
- Revisión mensual: ajustes operativos (sizing, stops).
- Revisión trimestral: cambios de reglas (timing, costes).
- Revisión anual: recalibración β, revisión de indicadores (capa B y F del módulo endógeno).
- Revisión trianual: auditoría de supuestos económicos (capa H).

---

→ Módulo detallado: [[03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/Self-Awareness|FX Self-Awareness Module]]


---

→ Índice del módulo: [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]]
