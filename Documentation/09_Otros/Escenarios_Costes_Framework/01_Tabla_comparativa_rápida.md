## Tabla comparativa rápida

| Concepto | Escenario A (Arranque) | Escenario B (Backup) | Escenario C (Institucional) |
|---|---|---|---|
| **Coste mensual** | ~$15 | ~$73 | ~$4,300+ |
| **Fuentes de datos** | FRED, ECB SDW, yfinance, CFTC, BIS | A + Alpha Vantage Premium + Twelve Data | A + Bloomberg Terminal + Reuters Eikon + EPFR |
| **Datos macro (CPI, ISM, yields, empleo)** | ✅ FRED + ECB (oficiales, robustos) | ✅ Igual que A (Alpha Vantage no los tiene) | ✅ Bloomberg (overkill) |
| **FX spot diario G10** | ✅ yfinance | ✅ yfinance + backup Twelve Data | ✅ Bloomberg |
| **Commodities (WTI, gold, iron ore)** | ✅ yfinance + FRED | ✅ Igual que A | ✅ Bloomberg |
| **CFTC COT semanal** | ✅ CFTC.gov directo | ✅ Igual que A | ✅ Bloomberg |
| **VIX, S&P, DXY, risk-on/off** | ✅ yfinance | ✅ Igual que A | ✅ Bloomberg |
| **Intradía / alta frecuencia** | ❌ No necesario | ⚠️ Posible, pero no se usa | ✅ Sí |
| **Soporte técnico del vendor** | ❌ Comunidad open source | ✅ Sí (email/chat) | ✅ Dedicado |
| **API estable con SLA** | ❌ yfinance puede cambiar sin aviso | ✅ Contrato formal | ✅ Contrato formal |
| **Recomendación** | **✅ USAR AHORA** | ⏳ Reconsiderar en mes 6-12 si A falla | ❌ No usar hasta capital institucional |

---


---

→ Índice del módulo: [[09_Otros/Escenarios_Costes_Framework/README|Escenarios Costes]]
