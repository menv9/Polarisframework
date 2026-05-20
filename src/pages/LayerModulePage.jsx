import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  Layers,
  ListChecks,
  Route,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'

const MODULES = {
  fxTrend: {
    code: 'G10',
    title: 'Capa 2 - FX Trend Layer',
    subtitle: 'Trend following / momentum de corto plazo filtrado por la direccion macro de Capa 1.',
    status: 'Documented / not automated',
    horizon: '1-2 semanas',
    docsPath: 'Documentation/04_CAPAS_Adicionales/FX_Trend_Layer_Module',
    accent: 'text-[#60a5fa]',
    border: 'border-[#60a5fa]',
    principle: 'Capa 2 nunca contradice Capa 1. Si Capa 1 dice long EUR/USD, Capa 2 solo puede abrir longs en EUR/USD. Sin senal macro de fondo, no opera el par.',
    input: 'Senal_FX(par) de Capa 1: Endogenous + Exogenous + World View.',
    output: 'Trades cortos con sizing reducido, confirmados por setup tecnico en direccion macro.',
    readiness: [
      'Capa 1 operativa durante 12 meses o mas.',
      'Sharpe rolling 12m de Capa 1 >= 0.5.',
      'Capa 1 en Tramo 3 del capital ramp-up.',
      '0 overrides discrecionales en Capa 1 durante los ultimos 6 meses.',
    ],
    filters: [
      ['Senal macro minima', '|Senal_FX(par)| >= 1.0 sigma. La direccion C2 = direccion C1.'],
      ['Volatilidad apta', 'ATR(14) entre P30 y P80 de su distribucion 5Y.'],
      ['Liquidez de horario', 'Entries solo en London, NY u overlap. Asia = monitoreo, no entries.'],
      ['Eventos', 'No abrir si hay evento Nivel 1 en las proximas 24h.'],
    ],
    setups: [
      {
        id: 'C2-1',
        name: 'Breakout de rango con momentum',
        conditions: [
          'Rango minimo de 5-10 dias.',
          'Cierre fuera del rango con vela > 1.3x ATR(14).',
          'Volumen tick proxy > media 10 dias.',
          'ADX subiendo desde <20 hacia >25.',
        ],
        entry: 'Cierre del breakout, sin esperar retest.',
        stop: 'Dentro del rango, 0.5x rango o 1-1.5x ATR.',
        target: 'Altura del rango x 1.0 a 1.5.',
        holding: '5-15 dias.',
      },
      {
        id: 'C2-2',
        name: 'Pullback rapido a MA con momentum',
        conditions: [
          'Tendencia diaria clara: precio sobre 20dma y 20dma > 50dma para long.',
          'Pullback a 20dma o low de 5 dias.',
          'RSI(14) recupera desde 35-45 para long o 55-65 para short.',
          'Vela de rejection: pin bar, hammer o engulfing.',
        ],
        entry: 'Cierre de la vela de rejection.',
        stop: 'Bajo wick/extremo de vela, normalmente 1-1.5x ATR.',
        target: 'Retorno al swing reciente, normalmente 1.5-2R.',
        holding: '3-10 dias.',
      },
      {
        id: 'C2-3',
        name: 'Continuacion tras consolidacion corta',
        conditions: [
          'Impulso direccional reciente >2 ATR en 3-5 dias.',
          'Consolidacion de 3-7 dias con rango decreciente.',
          'ATR del rango < 0.7x ATR previo.',
          'Ruptura y cierre fuera del banderin en direccion del impulso.',
        ],
        entry: 'Cierre de la ruptura.',
        stop: 'Dentro del banderin, normalmente 0.5-1x ATR.',
        target: 'Altura del impulso original como minimo, normalmente 2R.',
        holding: '3-8 dias.',
      },
    ],
    pipeline: [
      'Senal_FX(par) de Capa 1 disponible y |Senal| >= 1 sigma.',
      'Aplicar filtros: ATR P30-P80, sesion London/NY, sin evento Nivel 1 en 24h.',
      'Buscar setup C2-1, C2-2 o C2-3 en direccion de Capa 1.',
      'Comprobar si Capa 1 ya esta abierta en el mismo par o correlado.',
      'Calcular Pos_C2 = min(0.5% RPT, 1/5 Kelly, 6% vol target).',
      'Definir stop 1.5-2.0x ATR, target 1.5-2.5R y stop temporal 21 dias.',
      'Enviar a Execution con entry, OCO y GTD 21 dias.',
    ],
    parameters: [
      ['Risk per trade', '0.5%', '0.3% - 0.75%'],
      ['Kelly fraction', '1/5', '1/6 - 1/4'],
      ['Vol target anual', '6%', '4% - 9%'],
      ['ATR multiplier stop', '1.75', '1.5 - 2.0'],
      ['Target', '2R', '1.5R - 2.5R'],
      ['Stop temporal', '21 dias', '14 - 28 dias'],
      ['Max trades simultaneos', '3', '2 - 4'],
      ['Reduccion si Capa 1 mismo par', 'x0.5', 'x0.4 - x0.6'],
      ['Reduccion si pares correlados', 'x0.7', 'x0.5 - x0.8'],
      ['DD pause level', '12%', '10% - 15%'],
    ],
    breakers: [
      ['0-5%', 'Normal', 'Full sizing'],
      ['5-8%', 'Watch', 'Revisar ultimos 10 trades C2'],
      ['8-12%', 'Reduce', 'Sizing -50% durante 1 mes'],
      ['12-15%', 'Pause', 'Solo cierres; no nuevos entries'],
      ['>15%', 'Stop', 'Cierre total y revision especifica C2'],
      ['Agregado >20%', 'Global pause', 'Pause global Capa 1 + Capa 2'],
    ],
    errors: [
      'Operar Capa 2 sin Capa 1 establecida.',
      'Permitir que Capa 2 contradiga Capa 1.',
      'Promediar Capa 2 a la baja.',
      'Mantener Capa 2 mas alla del stop temporal.',
      'Saltar filtros de vol extrema o sesion Asia.',
      'Usar el mismo sizing que Capa 1.',
      'No trackear Capa 2 por separado.',
    ],
    docs: [
      'Filosofia y diferencias vs Capa 1',
      'Filtros de activacion',
      'Setups tecnicos de entry',
      'Position sizing',
      'Reglas de salida especificas',
      'Actualizacion dinamica de beta',
      'Pipeline Capa 2',
      'Metricas esperadas',
      'Circuit breakers',
      'Integracion con otros modulos',
      'Activacion de Capa 2',
      'Parametros default',
      'Errores especificos',
    ],
  },
  equitiesMacro: {
    code: 'G11',
    title: 'Capa 3 - Equities Macro Layer',
    subtitle: 'Aplicacion del motor macro FX a ETFs sectoriales y large caps macro-sensibles.',
    status: 'Documented / not automated',
    horizon: '1-4 meses',
    docsPath: 'Documentation/04_CAPAS_Adicionales/Equities_Macro_Layer_Module',
    accent: 'text-[#4ade80]',
    border: 'border-[#4ade80]',
    principle: 'Una sola tesis macro puede expresarse en varios instrumentos. La macro mueve divisas, pero tambien sectores y empresas expuestas a commodities, ciclo, tipos, China, USD y riesgo.',
    input: 'Score macro de Capa 1 mas drivers exogenos por sector o empresa.',
    output: 'Posiciones long/short en ETFs y large caps con sizing, horizonte y controles propios.',
    readiness: [
      'Capa 1 con 18 meses o mas de operativa estable.',
      'Sharpe rolling 12m de Capa 1 >= 0.6.',
      'Capa 2, si esta activa, con 12 meses estable.',
      'Disciplina demostrada en capas previas.',
      'Capital minimo recomendado: 25k USD.',
    ],
    universe: [
      ['Pro-ciclicos / China', 'XLB, XLI, GDX, EEM, XLE'],
      ['Defensivos / refugio', 'XLU, XLP, GLD, TLT, IEF'],
      ['Growth / tipos', 'XLK, QQQ, XLF'],
      ['Internacional', 'EWZ, EWY, EWJ, EWG, FXI'],
      ['Large caps ano 2+', 'BHP, RIO, VALE, XOM, CVX, NEM, FCX, JPM, AAPL, MSFT, NVDA'],
    ],
    mapping: [
      ['Iron ore + China PMI', 'Long XLB, GDX, BHP, RIO, FCX', 'Short XLB proxy / FXI'],
      ['Brent / WTI', 'Long XLE, XOM, BP', 'Short XLE'],
      ['US 10Y real rate alto', 'Long XLF', 'Short XLU, XLK, GLD, TLT, GDX'],
      ['China credit impulse', 'Long EEM, FXI, XLB, copper miners', 'No default short'],
      ['VIX risk-off', 'Long XLU, XLP, GLD, TLT', 'Short XLB, XLI, EEM, XLF'],
      ['US ISM Manufacturing', 'Long XLI, XLB', 'Short XLU'],
      ['DXY trend fuerte', 'No default long', 'Short EEM, EWZ'],
      ['Oro / real rates inverso', 'Long GLD, GDX, NEM', 'No default short'],
    ],
    scoring: [
      'Score_Equity(X) = sum(z_driver_i * signo_i * beta_i_para_X).',
      'Score > +1.5 sigma: long conviccion alta.',
      'Score > +1.0 sigma: long conviccion media, sizing reducido.',
      '|Score| < 1.0 sigma: no operar.',
      'Score < -1.0 sigma: short; score < -1.5 sigma: short conviccion alta.',
      'Si contradice World View o regimen, no ejecutar.',
    ],
    pipeline: [
      'Analisis macro Capa 1 disponible: Score_Endo + Score_Exo.',
      'Identificar drivers dominantes con z-scores extremos.',
      'Mapear drivers a instrumentos elegibles segun tabla de Capa 3.',
      'Calcular Score_Equity(X) para cada candidato.',
      'Filtrar candidatos con |Score| >= 1.0 sigma.',
      'Verificar coherencia con World View y earnings en proximas 2 semanas.',
      'Calcular sizing: min(0.75% RPT, 1/4 Kelly, 10% vol target).',
      'Enviar a Execution con reglas especificas de equities.',
    ],
    parameters: [
      ['Risk per trade', '0.75%', '0.5% - 1.0%'],
      ['Kelly fraction', '1/4', '1/6 - 1/3'],
      ['Vol target anual', '10%', '7% - 14%'],
      ['ATR multiplier ETF', '2.5', '2.0 - 3.0'],
      ['ATR multiplier large cap', '3.0', '2.5 - 3.5'],
      ['ATR multiplier single stock', '3.5', '3.0 - 4.0'],
      ['Target ETFs', '1.5-2R', '1.5R - 2.5R'],
      ['Target stocks', '2-3R', '2R - 3.5R'],
      ['Stop temporal ETF', '13 semanas', '10 - 16'],
      ['Stop temporal large cap', '17 semanas', '13 - 21'],
      ['Max trades simultaneos', '4', '3 - 5'],
      ['Max notional por instrumento', '15%', '10% - 20%'],
      ['Max notional por sector', '25%', '20% - 30%'],
      ['DD pause level', '20%', '15% - 25%'],
    ],
    breakers: [
      ['0-5%', 'Normal', 'Full sizing'],
      ['5-10%', 'Watch', 'Revisar drivers y mapeos'],
      ['10-15%', 'Reduce 1', 'Sizing -50%'],
      ['15-20%', 'Reduce 2', 'Sizing -75%, solo ETFs'],
      ['20-25%', 'Pause', 'No nuevos entries; trailing en abiertas'],
      ['>25%', 'Stop', 'Cierre total y revision driver->instrumento'],
      ['Agregado >25%', 'Global pause', 'Pause global de todo el sistema'],
    ],
    errors: [
      'Operar single stocks antes de dominar ETFs.',
      'Saltar verificacion de earnings calendar.',
      'Asumir el mismo edge que FX.',
      'Doble computo del regimen y de la exposicion China/USD/risk-off.',
      'Ignorar dividend yield en shorts.',
      'Operar mercados no liquidos o mid-caps con ADV bajo.',
      'No actualizar el mapeo driver->instrumento.',
    ],
    docs: [
      'Filosofia y diferencias vs FX',
      'Universo de instrumentos',
      'Mapeo driver macro a instrumento',
      'Construccion del score para equities',
      'Position sizing',
      'Costes y operativa especifica',
      'Pipeline Capa 3',
      'Metricas esperadas',
      'Circuit breakers',
      'Activacion de Capa 3',
      'Riesgo de correlacion triple',
      'Parametros default',
      'Errores especificos',
      'Integracion con otros modulos',
    ],
  },
}

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`border-2 border-[#333] ${className}`}>
      <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5 flex items-center gap-2">
        <Icon size={15} className="text-[#ecd987]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">{title}</span>
      </div>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#aaa]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Pipeline({ steps, accent }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className="min-h-[92px] border-b border-r border-[#222] p-3">
          <div className={`mb-2 font-mono text-[10px] font-bold ${accent}`}>{String(index + 1).padStart(2, '0')}</div>
          <div className="text-xs leading-relaxed text-[#aaa]">{step}</div>
        </div>
      ))}
    </div>
  )
}

function ParamTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] table-fixed text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            <th className="w-[42%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Parametro</th>
            <th className="w-[24%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Default</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Rango</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([param, value, range]) => (
            <tr key={param} className="border-t border-[#111]">
              <td className="px-3 py-2 text-[#ddd]">{param}</td>
              <td className="px-3 py-2 font-mono text-white">{value}</td>
              <td className="px-3 py-2 font-mono text-[#777]">{range}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BreakerTable({ rows }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([level, state, action]) => (
        <div key={`${level}-${state}`} className="border-b border-r border-[#222] p-3">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="font-mono text-sm font-bold text-white">{level}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]">{state}</span>
          </div>
          <div className="text-xs leading-relaxed text-[#888]">{action}</div>
        </div>
      ))}
    </div>
  )
}

function SetupCards({ setups, accent }) {
  return (
    <div className="grid gap-0 xl:grid-cols-3">
      {setups.map((setup) => (
        <article key={setup.id} className="border-b border-r border-[#222] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className={`font-mono text-sm font-bold ${accent}`}>{setup.id}</span>
            <span className="text-[10px] uppercase tracking-widest text-[#555]">{setup.holding}</span>
          </div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">{setup.name}</h3>
          <BulletList items={setup.conditions} />
          <div className="mt-3 grid gap-1.5 text-[11px] text-[#777]">
            <div><span className="text-[#aaa]">Entry:</span> {setup.entry}</div>
            <div><span className="text-[#aaa]">Stop:</span> {setup.stop}</div>
            <div><span className="text-[#aaa]">Target:</span> {setup.target}</div>
          </div>
        </article>
      ))}
    </div>
  )
}

function FxTrendContent({ mod }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Section title="Filtros de activacion" icon={ListChecks}>
          <div className="grid gap-0 sm:grid-cols-2">
            {mod.filters.map(([label, text]) => (
              <div key={label} className="border-b border-r border-[#222] p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{label}</div>
                <p className="text-xs leading-relaxed text-[#aaa]">{text}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Readiness para desplegar" icon={CheckCircle2}>
          <div className="p-3">
            <BulletList items={mod.readiness} />
          </div>
        </Section>
      </div>

      <Section title="Setups tecnicos Capa 2" icon={BarChart3} className="mt-4">
        <SetupCards setups={mod.setups} accent={mod.accent} />
      </Section>
    </>
  )
}

function EquitiesContent({ mod }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Section title="Universo de instrumentos" icon={Layers}>
          <div className="grid gap-0 sm:grid-cols-2">
            {mod.universe.map(([group, instruments]) => (
              <div key={group} className="border-b border-r border-[#222] p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{group}</div>
                <p className="font-mono text-xs leading-relaxed text-[#aaa]">{instruments}</p>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Mapping driver macro a instrumento" icon={GitBranch}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] table-fixed text-sm">
              <thead>
                <tr className="bg-[#111] text-left">
                  <th className="w-[28%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Driver</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Long si z alto</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Short si z bajo</th>
                </tr>
              </thead>
              <tbody>
                {mod.mapping.map(([driver, longSide, shortSide]) => (
                  <tr key={driver} className="border-t border-[#111]">
                    <td className="px-3 py-2 font-bold text-[#ddd]">{driver}</td>
                    <td className="px-3 py-2 text-xs text-[#aaa]">{longSide}</td>
                    <td className="px-3 py-2 text-xs text-[#aaa]">{shortSide}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section title="Score y decision" icon={SlidersHorizontal} className="mt-4">
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
          {mod.scoring.map((rule) => (
            <div key={rule} className="border-b border-r border-[#222] p-3 text-xs leading-relaxed text-[#aaa]">
              {rule}
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function LayerModulePage({ moduleKey }) {
  const mod = MODULES[moduleKey]

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.28em] ${mod.accent}`}>{mod.code}</div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">{mod.title}</h1>
            <p className="mt-1 max-w-4xl text-sm text-[#888]">{mod.subtitle}</p>
          </div>
          <div className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            {mod.status} / {mod.horizon}
          </div>
        </div>

        <section className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-2 border-[#333] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">
              <BookOpen size={15} />
              Principio central
            </div>
            <p className="text-sm leading-relaxed text-white">{mod.principle}</p>
          </div>
          <div className="grid gap-0 border-2 border-[#333] sm:grid-cols-2">
            <div className="border-b border-r border-[#222] p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Input</div>
              <div className="text-xs leading-relaxed text-[#aaa]">{mod.input}</div>
            </div>
            <div className="border-b border-[#222] p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Output</div>
              <div className="text-xs leading-relaxed text-[#aaa]">{mod.output}</div>
            </div>
            <div className="border-r border-[#222] p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Docs</div>
              <div className="font-mono text-xs text-[#aaa]">{mod.docs.length} archivos</div>
            </div>
            <div className="p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Ruta</div>
              <div className="break-all font-mono text-[10px] text-[#777]">{mod.docsPath}</div>
            </div>
          </div>
        </section>

        {moduleKey === 'fxTrend' ? <FxTrendContent mod={mod} /> : <EquitiesContent mod={mod} />}

        <Section title="Pipeline operativo" icon={Route} className="mt-4">
          <Pipeline steps={mod.pipeline} accent={mod.accent} />
        </Section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <Section title="Parametros default" icon={SlidersHorizontal}>
            <ParamTable rows={mod.parameters} />
          </Section>

          <Section title="Circuit breakers" icon={ShieldAlert}>
            <BreakerTable rows={mod.breakers} />
          </Section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Section title="Errores especificos a evitar" icon={AlertTriangle}>
            <div className="p-3">
              <BulletList items={mod.errors} />
            </div>
          </Section>

          <Section title="Indice documental cubierto" icon={FileText}>
            <div className="grid gap-1.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {mod.docs.map((doc, index) => (
                <div key={doc} className="flex items-start gap-2 border border-[#222] px-2 py-1.5 text-xs text-[#aaa]">
                  <span className={`font-mono ${mod.accent}`}>{String(index + 1).padStart(2, '0')}</span>
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Pantalla operativa basada en la documentacion. No ejecuta trades ni calcula senales automaticamente todavia.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export function FXTrendLayerPage() {
  return <LayerModulePage moduleKey="fxTrend" />
}

export function EquitiesMacroLayerPage() {
  return <LayerModulePage moduleKey="equitiesMacro" />
}
