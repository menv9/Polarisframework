## 🤖 AUTOMÁTICO (sin intervención humana)
Datos
Descarga diaria de las 24+ series macro (FRED, yfinance, ECB SDW)
Limpieza, transformaciones (z-scores 10Y rolling, winsorización)
Health checks (cobertura, frescura, outliers, estacionariedad)
Almacenamiento en Parquet/SQLite
Cálculos
Z-scores de todos los drivers
Score_Endo, Score_Exo, Score_Total por país
Señal_FX(A/B) por par
Score_Commodity y Score_Crypto
World View state (régimen risk-on/off, USD bias, inflación)
CFTC z-score posicionamiento
ATR, IV, métricas de vol
Risk
Cálculo de position sizing (RPT + Kelly + VolTarget → MIN)
Detección de circuit breakers por DD
Multiplicadores (convicción, vol, DD)
Exposición agregada por divisa
Health check pre-trade
Monitoring
Métricas Self-Awareness diarias (Sharpe, Sortino, MDD, hit rate, IC)
Atribución por bloque y driver
Master sheet multi-broker (si automatizable vía API)
Logging trade journal (campos cuantitativos)
Alertas
CFTC en extremos (z > +2 o < −2)
Drift correlación β > 0.15 durante 2 meses
DD niveles (Watch/Reduce/Pause/Stop)
Cambio régimen World View
Eventos NIVEL 1 en próximas 48h
Health check fail rate > 30%
β cambia de signo
Recalibración
Rolling β mensual (Capa 1)
Kalman update semanal (Capa 2)
Recalibración anual completa (con tests anti-espuria)

---

→ Índice del módulo: [[09_Otros/automatizar si o no/README|Automatizar]]
