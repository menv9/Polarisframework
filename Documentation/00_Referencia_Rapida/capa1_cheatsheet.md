# Polaris Framework — Capa 1 Cheat Sheet

> Referencia compacta con todas las fórmulas, umbrales y tablas necesarias para ejecutar el motor macro de la Capa 1 (World View + Endogenous + Exogenous).

---

## 1. Pipeline General

```
Datos brutos → z-scores 10Y → Score_Endo + Score_Exo → Score_Total → Señal_FX(A/B)
                                    ↑
                           World View (régimen, momentum, USD bias, inflación)
                                    ↓
                           Filtro régimen + veto + timing + risk
```

---

## 2. World View

### 2.1 Inputs de mercado (diarios)
| Variable | Threshold Risk-ON | Threshold Risk-OFF |
|---|---|---|
| VIX | < P30(5Y) | > P70(5Y) |
| HY OAS | < P30(5Y) | > P70(5Y) |
| S&P 500 vs 200dma | Rising | Falling |
| EMBI Global | < P40(5Y) | > P70(5Y) |

**Regla:**
- **ON:** 4 de 4 condiciones ON
- **OFF:** cualquiera en OFF
- **MIXTO:** resto
- **Confirmación:** 5 sesiones (salto >3σ → inmediato)

### 2.2 Momentum Global
```
GDP_gap(país) = Nowcast − Consensus

Score_crecimiento_global = 0.25·GDP_gap(USA) + 0.18·GDP_gap(EUR)
                         + 0.18·GDP_gap(CHN) + 0.05·GDP_gap(JPN)
                         + 0.34·GDP_gap(resto)
```
- Proxy práctico: CESI agregado
- Output: `momentum_global ∈ [−2, +2]`

### 2.3 USD Bias
```
Bullish: DXY 200dma rising AND DXY > 100
Bearish: DXY 200dma falling AND DXY < 95
Neutral: resto
```

### 2.4 Inflación Global
```
INF:     CPI G7 mediana > 3% YoY AND breakevens 5Y5Y > 2.5%
DESINF:  CPI G7 mediana < 2% YoY trend ↓ AND breakevens ↓
ESTABLE: ~2%, BC en hold
```

### 2.5 Vector de Estado World View
```
WorldView_state = {
  régimen_riesgo:     ON / OFF / MIXTO
  momentum_global:    ∈ [−2, +2]
  WoC_consenso:       smart money bias direccional
  USD_bias:           bullish / bearish / neutral
  régimen_inflación:  INF / DESINF / ESTABLE
}
```

---

## 3. Endogenous — Z-Scores

```
z_i = clip( (rate_i − μ_i,10Y) / σ_i,10Y , −10, +10 )
```

- Ventana: 10 años rolling
- Winsorización 1%/99% antes de μ/σ
- Series no-estacionarias (deuda, balance CB, NIIP): diferencia anual primero

### 3.1 Fórmula Diferencial
```
Δz_i(A/B) = z_i(A) − z_i(B)          [excepto #18: real_rate_2Y_diff directo]

Score_Endo(país) = Σ_i ( β_i · Δz_i · signo_i_FX · filtro_régimen_i )

Señal_FX(A/B) = Score_Total(A) − Score_Total(B)
```

### 3.2 Signos FX v2 (Endogenous)
| Indicador | Signo FX | Razón |
|---|---|---|
| Tipo real negativo | − | Carry negativo |
| CPI alto + BC hawkish | + | Sube tipos reales |
| CPI alto + BC dovish | − | Eroda poder adquisitivo |
| Deuda/GDP > 100% | − | Riesgo soberano |
| Déficit fiscal > 5% | − | Salvo fuerce al BC |
| Bono 10Y mínimos | − | Sin atractivo carry |
| Bono 10Y subiendo | + | Atractivo carry creciente |
| Balance CB/GDP creciente | − | Dilución monetaria |
| ISM/NMI > 55 | + | Crecimiento atrae capital |
| ISM < 45 | − (salvo refugio) | Salida de capital |
| M2 > 10% | − | Exceso oferta monetaria |
| NFP fuerte | + | Soporta tipos reales |
| Liquidity Cover alto | + | Solvencia exterior |

---

## 4. Endogenous — Betas Iniciales (§15.2)

| # | Indicador | β inicial | Horizonte |
|---|---|---|---|
| 1 | ISM Manufacturing | 0.04 | Medio |
| 2 | NMI Services | 0.03 | Medio |
| 3 | UMCSI | 0.02 | Medio |
| 4 | Building Permits YoY | 0.02 | Medio |
| 5 | M2 YoY | 0.03 | Medio-largo |
| 6 | Tipo nominal BC | 0.05 | Medio |
| 7 | CPI YoY | 0.04 | Medio |
| 8 | Core CPI YoY | 0.05 | Medio |
| 9 | PPI All YoY | 0.02 | Medio |
| 10 | Core PPI YoY | 0.02 | Medio |
| 11 | NFP / empleo YoY | 0.04 | Medio |
| 12 | Govt Debt/GDP | 0.03 | Largo |
| 13 | Govt S/D % GDP | 0.03 | Largo |
| 14 | Interest/GDP | 0.02 | Largo |
| 15 | Liquidity Cover | 0.02 | Largo |
| 16 | 10Y yield real (TIPS) | 0.06 | Medio |
| 17 | CB Balance/GDP YoY | 0.04 | Medio-largo |
| **18** | **Diferencial tipos reales 2Y** | **0.14** | **Medio (DOMINANTE)** |
| 19 | Cuenta corriente % GDP | 0.07 | Largo |
| 20 | NIIP % GDP | 0.05 | Largo |
| 21 | Términos de intercambio YoY | 0.06 | Medio-largo |
| 22 | Breakevens 5Y5Y | 0.05 | Medio |
| 23 | CFTC posicionamiento | 0.04 | Corto |
| 24 | REER desviación 10Y | 0.03 | Largo |
| | **Σ |β|** | **1.00** | |

> **Nota #18:** Ya es un spread. No calcular Δz(A)−Δz(B). Usar directo:
> `z_18 = (rate_diff − μ_diff,10Y) / σ_diff,10Y`

---

## 5. Clasificación Divisas G10

| Divisa | Tipo | β vs riesgo | Comentario |
|---|---|---|---|
| USD | Refugio | −0.4 | Refugio dominante |
| JPY | Refugio | −0.6 | Refugio puro |
| CHF | Refugio | −0.5 | BNS interviene |
| EUR | Mixto | ~0 | Reactiva a diferencial vs USD |
| GBP | Mixto/pro-cíclica leve | +0.2 | Riesgo idiosincrático |
| CAD | Pro-cíclica (commodity) | +0.5 | Petróleo + ciclo USA |
| AUD | Pro-cíclica (commodity) | +0.8 | Hierro + ciclo China |
| NZD | Pro-cíclica (commodity) | +0.7 | Lácteos + ciclo Asia |
| SEK | Pro-cíclica | +0.6 | Manufactura europea |
| NOK | Pro-cíclica (commodity) | +0.7 | Petróleo + Eurozona |

---

## 6. Multiplicadores de Filtro de Régimen (§15.3)

### Risk-ON (VIX<18 ∧ HY<400 ∧ S&P rising)
| Indicador | Pro-cíclica | Mixto | Refugio |
|---|---|---|---|
| Crecimiento (ISM, NMI, NFP, BP) | 1.0 | 0.7 | 0.3 |
| Tipos reales 2Y, OIS forward | 1.0 | 1.0 | 1.0 |
| CPI / Core CPI | 0.7 | 0.7 | 0.5 |
| Breakevens 5Y5Y | 0.7 | 0.7 | 0.5 |
| Deuda / Balance CB / Liquidity | 0.7 | 0.7 | 0.5 |
| ToT (commodity exporters) | 1.0 | 0.3 | 0 |
| CFTC posicionamiento | 1.0 | 1.0 | 1.0 |
| REER desviación | 0.5 | 0.5 | 0.5 |

### Risk-OFF (VIX>25 ∨ HY>600 ∨ S&P falling)
| Indicador | Pro-cíclica | Mixto | Refugio |
|---|---|---|---|
| Crecimiento propio | 0.3 | 0.5 | 0.5 |
| Tipos reales 2Y | 0.7 | 0.8 | 1.0 |
| Riesgo soberano (Debt/GDP>100%) | **−1.5** | −1.0 | −0.5 |
| ToT | 0.5 | 0 | 0 |
| CFTC | 1.2 | 1.0 | 1.0 |
| Ajuste estructural refugio | — | — | **+0.5 al score final** |

### MIXTO
Promedio entre Risk-ON y Risk-OFF. Sin ajuste estructural.

---

## 7. Estratificación por Horizonte

### Corto (1-4 semanas) — w=0.20
| Driver | Peso |
|---|---|
| CFTC posicionamiento | 25 |
| CESI sorpresas macro | 20 |
| Momentum precio 20d | 20 |
| Risk-on/off proxy | 15 |
| Diferencial OIS 1M | 20 |

### Medio (1-3 meses) — w=0.50
| Driver | Peso |
|---|---|
| Diferencial tipos reales 2Y | 25 |
| Diferencial breakevens 5Y5Y | 15 |
| ISM/PMI compuesto | 12 |
| NMI Services | 8 |
| Empleo (NFP) | 10 |
| CPI / Core CPI | 10 |
| Diferencial OIS 1Y forward | 20 |

### Largo (3-12 meses+) — w=0.30
| Driver | Peso |
|---|---|
| Cuenta corriente % GDP | 20 |
| NIIP | 15 |
| Términos de intercambio | 15 |
| REER desviación 10Y | 15 |
| Deuda/GDP (neg si >100%) | 10 |
| Balance CB/GDP (neg si creciente) | 10 |
| Liquidity Cover | 10 |
| Building Permits, UMCSI | 5 |

```
Score_FX(pais) = 0.20·Score_corto + 0.50·Score_medio + 0.30·Score_largo
```

---

## 8. Exogenous — Betas por Divisa

```
Score_Exo(X) = Σ_D z(D)·signo·β_D

Score_Total(X) = (1 − w_exo)·Score_Endo(X) + w_exo·Score_Exo(X)
```

| Divisa | w_exo | Drivers principales (β) |
|---|---|---|
| USD | 0.25 | VIX>P70: +0.40, De-dollarization: −0.30, G7 yield diff vs US: −0.30 |
| EUR | 0.35 | US real rate 2Y: −0.30, China PMI: +0.20, Brent: −0.15, Italy spread: −0.20, US 10Y: −0.15 |
| JPY | 0.50 | US 10Y: −0.40, VIX: +0.20, Risk-off: +0.20, US-JP real diff: −0.20 |
| GBP | 0.40 | EUR/USD trend: +0.35, EZ PMI: +0.20, Brent: +0.15, UK political risk: −0.30 |
| CHF | 0.55 | EUR/USD inv: −0.40, VIX: +0.25, SNB intervention: −0.20, EZ crisis: +0.15 |
| CAD | 0.50 | WTI/Brent: +0.35, US ISM: +0.25, US 10Y: −0.15, Risk-on: +0.20 |
| AUD | 0.60 | Iron ore: +0.30, China PMI: +0.25, China credit impulse: +0.20, Copper: +0.15, Risk-on: +0.20, RBA-Fed diff: +0.15 |
| NZD | 0.55 | AUD/USD: +0.40, Global Dairy Trade: +0.25, China PMI: +0.15, Risk-on: +0.20 |
| SEK | 0.50 | EUR/USD: +0.40, EZ PMI: +0.25, Risk-on: +0.25, Riksbank-ECB: +0.15 |
| NOK | 0.55 | Brent: +0.35, EZ PMI: +0.20, EUR/USD: +0.20, Risk-on: +0.20, Norges-ECB: +0.15 |

---

## 9. Umbral de Convicción

```
σ_señal = std(Señal_FX(A/B), 10 años)

Posición FULL:    |Señal| > 1.5·σ
Posición MEDIA:   1.0·σ < |Señal| ≤ 1.5·σ
Sin posición:     |Señal| ≤ 1.0·σ
```

Aproximación inicial (sin backtest propio, Σ|β|=1):
- Full: |Señal| > 0.6
- Media: 0.4 < |Señal| ≤ 0.6
- Flat: |Señal| ≤ 0.4

---

## 10. Veto World View (§7.4)

World View VETA el trade si:
- Risk-OFF severo (4/4 >P80) Y trade es pro-cíclica
- Risk-ON eufórico (4/4 <P20) Y trade es refugio largo
- USD_bias strong bullish (4σ) Y trade es short USD
- Régimen inflación cambia bruscamente (>1pp breakevens en 1 mes)

**Decisión:** NO operar. Esperar normalización.

---

## 11. Pipeline Diario (Resumen)

```python
1. update_all_series()
2. health_check() → pass_rate > 70%
3. zscores = calculate_zscores(window=10Y)
4. betas_endo = load("config/betas_capa1.yaml")
5. betas_exo = load_exo()
6. wv_state = calculate_world_view(zscores)
7. score_endo = compute_score_endo(zscores, betas_endo, wv_state)
8. score_exo = compute_score_exo(zscores, betas_exo)
9. score_total = combine(score_endo, score_exo, w_exo_table)
10. signals = compute_signals(score_total, pairs_g10)
11. actionable = filter_by_conviction(signals, min_sigma=1.0)
12. actionable = apply_wv_veto(actionable, wv_state)
13. For each signal: evaluate_timing() → trade-now?
```

---

## 12. Métricas Mínimas de Aceptación (Backtest §9)

| Métrica | Umbral |
|---|---|
| Sharpe ratio (OOS) | > 0.5 |
| Max drawdown | < 20% |
| Hit rate direccional | > 52% |
| Information Coefficient (IC) | > 0.05 |
| Estabilidad β (rolling) | Sin cambio de signo |

---

> **Nota:** Este cheat sheet es una síntesis operativa. Para caveats, extensiones (EM, Cross-Asset) y protocolos de riesgo, consultar los módulos específicos del framework.
