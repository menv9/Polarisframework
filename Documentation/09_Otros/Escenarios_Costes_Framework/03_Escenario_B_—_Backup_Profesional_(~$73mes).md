## Escenario B — Backup Profesional (~$73/mes)

### Qué añade al Escenario A
- **Alpha Vantage Premium ($50/mes):** API "oficial" de FX, stocks e indicadores técnicos. Más frecuencia, sin rate limits, soporte técnico.
- **Twelve Data ($8/mes):** API limpia de FX y ETFs, datos históricos estables.

### Ventajas reales (y marginales)
1. **yfinance puede romperse:** Yahoo cambia la estructura HTML sin avisar. Alpha Vantage/Twelve Data son APIs estables con contrato.
2. **Datos intradía:** Si algún día quieres hacer execution de alta frecuencia. **No es tu caso.** Tu horizonte es semanal/mensual.
3. **Menos código de scraping:** Pero ya usas `fredapi` (oficial) y librerías CFTC estandarizadas. No hay scraping frágil en tu pipeline crítico.
4. **Soporte técnico:** Si una API paga falla, tienes a quién reclamar.

### Por qué NO lo necesitas ahora
- **Alpha Vantage NO tiene tus indicadores macro clave.** No descargarás CPI, ISM, NFP o yields de Alpha Vantage. Los seguirás usando de FRED (gratis).
- **yfinance cubre todo lo que necesitas de FX y equities** para frecuencia diaria. El 99% de tus cálculos (z-scores, scores, señales) usan cierres diarios o mensuales.
- **+$58/mes = +$696/año.** Ese dinero es mejor invertido en: paper trading, libros (Grinold & Kahn, López de Prado), o como buffer psicológico de drawdown.
- **Tu riesgo no es la API de datos; es la calidad del modelo.** Si el sistema no funciona, no será por yfinance. Será por sobreajuste, look-ahead, o mala calibración de β.

---


---

→ Índice del módulo: [[09_Otros/Escenarios_Costes_Framework/README|Escenarios Costes]]
