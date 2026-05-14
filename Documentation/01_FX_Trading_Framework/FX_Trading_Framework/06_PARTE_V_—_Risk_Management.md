## PARTE V — Risk Management

> **Pregunta que responde:** ¿Cuánto arriesgar en cada trade y en el portfolio total?

**La capa que más distingue traders profesionales de retail.** No es opcional. Sin sizing y stops, el mejor sistema predictivo del mundo va a cero por ruina estadística (drawdown que no recupera).

### §15. Volatility Assessment
*[Por desarrollar]* ATR (14d, 20d), realized volatility (rolling 21d, 63d), implied volatility de opciones FX (1M, 3M ATM), term structure de IV. Régimen de vol (low/normal/high) determina ajuste de sizing.

### §16. Position Sizing
*[Por desarrollar]* 
- **Kelly fraccional** (típicamente ¼ o ½ Kelly por incertidumbre del edge): `f* = (p·b − q) / b`, aplicar 0.25·f*.
- **Vol-targeting:** posición = vol_objetivo / vol_realizada (típico target 10-15% anual).
- **Risk budget per trade:** % capital arriesgado (1-2% típico) entre entry y stop.
- Combinación: Kelly limita upside, vol-target normaliza, risk budget hard cap.

### §17. Stops y Exits
*[Por desarrollar]*
- **Stop técnico:** invalidación de tesis (ruptura de nivel clave, cambio de estructura).
- **Stop volatility-based:** ATR × multiplicador.
- **Stop temporal:** cerrar si no funciona en N días/semanas (la tesis tenía un horizonte).
- **Stop por nivel de señal:** cerrar si Señal_FX flips o cae bajo umbral.
- Trailing stops para capturar tendencia.

### §18. Portfolio Risk
*[Por desarrollar]* Correlación entre pares: long EUR/USD + long GBP/USD = doble exposición a USD. Calcular VaR portfolio, exposición neta por divisa (USD-net, EUR-net), límites por divisa. Stress test (escenarios 2008, 2015, 2020, 2022).

### §19. Drawdown Protocols / Circuit Breakers
*[Por desarrollar]*
- DD > 10% → reducir tamaño 50%.
- DD > 20% → parar operativa, revisar sistema.
- DD > 30% → asumir ruptura del modelo, recalibración obligatoria antes de continuar.
- Recuperación gradual: ramp-up sizing en 3 etapas tras drawdown.

---

→ Módulo detallado: [[03_CAPA_1_FX_Macro/FX_Risk_Management_Module/Riesgo|FX Risk Management Module]]


---

→ Índice del módulo: [[01_FX_Trading_Framework/FX_Trading_Framework/Orquestador|FX Trading Framework]]
