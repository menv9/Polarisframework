## Escenario A — Arranque Mínimo (~$15/mes)

### Stack
- **FRED API** (St. Louis Fed) — datos macro USA + globales, gratis, oficial, robusto desde 1950s.
- **ECB SDW** (Statistical Data Warehouse) — datos Eurozone, gratis, oficial.
- **yfinance** (Yahoo Finance) — FX spot, equities, commodities, ETFs. No es API oficial pero funciona perfectamente para frecuencia diaria.
- **CFTC.gov** — descarga directa de Commitment of Traders. Gratis, oficial, release viernes 15:30 ET.
- **BIS Statistics** — datos agregados globales (deuda, FX turnover, etc.). Gratis.
- **Telegram Bot API** — alertas al móvil. Gratis.
- **Cloud server** (DigitalOcean 2GB / AWS t3.small / Linode 2GB) — $6-12/mes.
- **Backups** (Backblaze B2 / S3) — $1-2/mes.

### Coste detallado
| Ítem | Coste mensual |
|---|---|
| DigitalOcean 2GB droplet | ~$12 |
| Backblaze B2 backups | ~$1 |
| Dominio + SSL (opcional) | ~$1 |
| FRED API | $0 |
| ECB SDW | $0 |
| yfinance | $0 |
| CFTC | $0 |
| BIS | $0 |
| Telegram Bot | $0 |
| GitHub repo privado | $0 |
| **TOTAL** | **~$14-15** |

### Por qué es suficiente
1. **Tu frecuencia es diaria/semanal/mensual.** No necesitas tick data, microsegundos de latencia ni APIs de alta frecuencia. yfinance te da OHLC diario de EUR/USD, SPY, VIX, DXY sin problemas.
2. **Tus indicadores macro están en fuentes oficiales gratuitas.** CPI, ISM, NFP, yields, GDP, deuda/GDP, balance CB — todo está en FRED o ECB SDW. Alpha Vantage NO tiene estas series macro.
3. **CFTC es gratis y oficial.** No necesitas un data vendor de pago para posicionamiento agregado.
4. **Tu horizonte operativo es 1-3 meses (Capa 1).** Un retraso de minutos o incluso horas en la descarga de datos no afecta la señal.
5. **Puedes correr local los primeros 2-3 meses.** El servidor cloud solo es necesario cuando quieras acceso remoto al dashboard o ejecución 24/7. Coste real mes 1-3: **$0**.

---


---

→ Índice del módulo: [[09_Otros/Escenarios_Costes_Framework/README|Escenarios Costes]]
