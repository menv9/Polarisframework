# Polaris Data Pipeline

Este documento define como deben fluir los datos dentro de Polaris para evitar mezclar fuentes, historicos raw y features del modelo.

## Regla principal

El framework y los modulos de decision deben consumir **Model Features**, no datos directos de Source Registry ni historicos raw.

Flujo canonico:

```text
Source Registry -> Coverage Matrix -> History Pipeline -> Model Features -> Framework
```

## Capas

### 1. Source Registry

Proposito: registrar de donde viene cada dato.

Contiene:

- `source_id`
- nombre del indicador
- endpoint o serie FRED/API
- tipo de acceso: FRED, REST, API publica, manual, pendiente
- `dataFit`: `exact`, `derived`, `proxy`, `manual`, `pending`
- `dataMeasure` y `dataCheck`
- latest value operativo

No es la capa final del modelo. Sirve para conectar, auditar y refrescar fuentes.

### 2. Coverage Matrix

Proposito: comparar lo que pide el framework contra lo que existe en Source Registry.

Responde:

- si una variable esta cubierta
- si la cobertura es exacta, derivada, proxy, manual o pendiente
- si la variable es comparable entre paises
- que transformacion conceptual espera el modelo
- que inputs externos siguen faltando

Coverage Matrix no transforma datos. Es una capa de auditoria y documentacion.

### 3. History Pipeline

Proposito: persistir historicos por `source_id`.

Contiene series historicas guardadas en Supabase `history_observations`.

Reglas:

- guarda la serie canonica mas cercana al indicador que se quiere modelar
- no debe mezclar z-scores o features finales
- puede guardar una serie derivada si esa derivacion define el indicador canonico
- debe conservar `start`, `end`, numero de observaciones y errores de ingesta

Ejemplos aceptables de historico canonico derivado:

- CPI YoY si el indicador del framework es CPI YoY
- real rate proxy si el indicador definido es real rate
- VIX percentile si el indicador definido es regimen de riesgo por percentil
- credit impulse proxy si se marca explicitamente como proxy

### 4. Model Features

Proposito: convertir historicos en senales comparables para el framework.

Produce:

- z-scores
- percentiles
- rolling z-scores
- spreads normalizados
- cambios YoY o QoQ finales si el modelo los consume como feature
- senales 1/0 cuando el modelo espera estado

Esta es la capa que debe alimentar el framework.

Contrato recomendado:

```text
source_id -> feature_method -> feature_value
```

Ejemplos:

```text
endo_usa_pmi -> rolling_zscore -> 0.7
wv_vix -> rolling_percentile -> 82
endo_usa_real_2y -> rolling_zscore -> 1.1
exo_chn_credit -> rolling_zscore -> 0.4
```

## Definiciones de fit

`exact`: serie directa o fuente oficial que representa el indicador.

`derived`: calculo necesario y estable para representar el indicador canonico.

`proxy`: sustituto operativo cuando la fuente exacta no es gratuita, automatizable o robusta.

`manual`: dato valido solo si se introduce manualmente desde la fuente indicada.

`pending`: falta endpoint, validacion o decision de fuente.

## Reglas de uso por el framework

1. El framework consume Model Features.
2. Las pantallas operativas pueden mostrar latest/raw para control visual.
3. Ningun modulo debe mezclar directamente valores raw con z-scores o percentiles.
4. Cualquier proxy debe estar marcado como `proxy` en Source Registry y Coverage Matrix.
5. Cualquier transformacion previa a Model Features debe estar descrita en `dataMeasure`.
6. El CSV de History y Coverage debe permitir auditar `fit`, `dataMeasure`, `dataCheck` y endpoint.

## Casos especiales actuales

PMI G10: las series exactas ISM/S&P/HCOB/Judo/BusinessNZ no estan disponibles de forma robusta en APIs gratuitas. Polaris usa proxies FRED/OECD de confianza manufacturera y los marca como `proxy`.

China Credit Impulse: el indice Bloomberg/PBoC exacto no esta automatizado. Polaris usa como proxy el cambio interanual en puntos porcentuales del credito total BIS/FRED sobre PIB (`QCNCAM770A`) y lo marca como `proxy`.

VIX/HY OAS/EMBI percentiles: son `derived` porque el framework no quiere el nivel raw, sino la posicion relativa historica.

Real rates: son `derived` cuando se calculan desde tipos nominales menos inflacion/expectativas.
