import { useMemo, useState } from 'react'
import {
  Activity,
  Banknote,
  BriefcaseBusiness,
  ChevronDown,
  Factory,
  Globe2,
  Landmark,
  LineChart,
  PackageOpen,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'

const COUNTRIES = [
  {
    code: 'US',
    flag: 'US',
    name: 'United States',
    currency: 'USD',
    region: 'North America',
    capital: 'Washington, D.C.',
    population: '335.9M',
    gdp: '$27.4T',
    gdpGrowth: '2.7%',
    inflation: '3.1%',
    policyRate: '5.50%',
    unemployment: '3.9%',
    fiscalBalance: '-6.3%',
    debt: '123%',
    currentAccount: '-3.0%',
    sovereignRating: 'AA+',
    fxBias: 'Moderately bullish USD',
    regime: 'Late-cycle resilience',
    risk: 'Election/fiscal premium',
    trade: 'Services surplus, goods deficit',
    momentum: 72,
    stress: 44,
    indicators: [
      ['Real GDP', '% y/y', '2.1', '2.9', '3.2', '2.8', '2.7'],
      ['Core CPI', '% y/y', '3.8', '3.4', '3.2', '3.1', '3.0'],
      ['Unemployment', '%', '3.8', '3.9', '4.0', '4.0', '4.1'],
      ['Retail sales', '% y/y', '2.7', '3.1', '3.6', '3.4', '3.0'],
      ['Industrial production', '% y/y', '-0.2', '0.4', '1.1', '1.3', '1.0'],
      ['Current account', '% GDP', '-3.1', '-3.0', '-2.9', '-2.9', '-2.8'],
    ],
    narrative: [
      'Growth remains above most developed-market peers despite restrictive rates.',
      'Inflation is cooling slowly, keeping the reaction function asymmetric.',
      'Fiscal impulse supports demand but adds term-premium and debt sustainability noise.',
    ],
    tabs: {
      macro: [
        ['Growth mix', 'Consumption still leads, capex is selective and inventory contribution is fading.'],
        ['Labour market', 'Hiring has cooled without a sharp break in income growth.'],
        ['Inflation pulse', 'Services inflation is the sticky component to monitor.'],
      ],
      markets: [
        ['Rates', 'Front-end remains policy anchored; long-end reacts to issuance and fiscal risk.'],
        ['FX', 'USD benefits when growth and real-rate differentials widen.'],
        ['Equities', 'Earnings breadth matters more than index-level momentum.'],
      ],
      risks: [
        ['Fiscal', 'Large deficits can lift term premium even in soft-landing scenarios.'],
        ['Policy', 'Premature easing could reprice inflation expectations.'],
        ['External', 'Global slowdown would hit export volumes less than risk appetite.'],
      ],
    },
  },
  {
    code: 'EU',
    flag: 'EU',
    name: 'Euro Area',
    currency: 'EUR',
    region: 'Europe',
    capital: 'Brussels / Frankfurt',
    population: '347.0M',
    gdp: '$15.5T',
    gdpGrowth: '0.9%',
    inflation: '2.4%',
    policyRate: '4.00%',
    unemployment: '6.5%',
    fiscalBalance: '-3.2%',
    debt: '88%',
    currentAccount: '2.1%',
    sovereignRating: 'AA-',
    fxBias: 'Neutral EUR',
    regime: 'Weak recovery',
    risk: 'Fragmentation risk',
    trade: 'External surplus recovering',
    momentum: 46,
    stress: 52,
    indicators: [
      ['Real GDP', '% y/y', '0.4', '0.6', '0.8', '0.9', '1.1'],
      ['Core CPI', '% y/y', '3.0', '2.8', '2.6', '2.4', '2.3'],
      ['Unemployment', '%', '6.5', '6.5', '6.6', '6.6', '6.7'],
      ['Retail sales', '% y/y', '-0.6', '0.1', '0.4', '0.7', '0.9'],
      ['Industrial production', '% y/y', '-2.3', '-1.4', '-0.6', '0.2', '0.6'],
      ['Current account', '% GDP', '1.9', '2.0', '2.1', '2.2', '2.2'],
    ],
    narrative: [
      'Disinflation is progressing, but growth impulse remains shallow.',
      'Manufacturing is the main drag; services are stabilising the floor.',
      'EUR needs either stronger activity data or a softer USD backdrop.',
    ],
    tabs: {
      macro: [
        ['Growth mix', 'Domestic demand is improving gradually from a low base.'],
        ['Labour market', 'Employment resilience limits recession risk but wage data matters.'],
        ['Inflation pulse', 'Goods disinflation is advanced; services are slower.'],
      ],
      markets: [
        ['Rates', 'Curve is sensitive to ECB easing expectations and peripheral spreads.'],
        ['FX', 'EUR rallies when global growth improves without renewed energy stress.'],
        ['Equities', 'Cyclicals need PMIs and Chinese demand to recover.'],
      ],
      risks: [
        ['Energy', 'Supply shocks would hit real income and trade terms.'],
        ['Politics', 'Fiscal negotiations can widen country spreads.'],
        ['China', 'Export channel remains exposed to weak external demand.'],
      ],
    },
  },
  {
    code: 'JP',
    flag: 'JP',
    name: 'Japan',
    currency: 'JPY',
    region: 'Asia',
    capital: 'Tokyo',
    population: '124.5M',
    gdp: '$4.2T',
    gdpGrowth: '0.7%',
    inflation: '2.6%',
    policyRate: '0.10%',
    unemployment: '2.5%',
    fiscalBalance: '-4.1%',
    debt: '255%',
    currentAccount: '3.6%',
    sovereignRating: 'A+',
    fxBias: 'JPY sensitive to yields',
    regime: 'Policy normalisation',
    risk: 'Yield-control exit path',
    trade: 'Income surplus dominates',
    momentum: 39,
    stress: 58,
    indicators: [
      ['Real GDP', '% y/y', '1.2', '0.8', '0.5', '0.7', '0.9'],
      ['Core CPI', '% y/y', '2.8', '2.7', '2.6', '2.5', '2.3'],
      ['Unemployment', '%', '2.6', '2.5', '2.5', '2.5', '2.6'],
      ['Retail sales', '% y/y', '2.1', '1.8', '1.4', '1.6', '1.7'],
      ['Industrial production', '% y/y', '-1.1', '-0.7', '0.3', '0.8', '1.0'],
      ['Current account', '% GDP', '3.3', '3.4', '3.5', '3.6', '3.7'],
    ],
    narrative: [
      'Japan is transitioning from deflation psychology to wage-led reflation.',
      'JPY valuation is cheap, but rate differentials still dominate timing.',
      'External income balance supports the structural account.',
    ],
    tabs: {
      macro: [
        ['Growth mix', 'Real wages are the key bridge from inflation to domestic demand.'],
        ['Labour market', 'Tight labour supply supports wage negotiations.'],
        ['Inflation pulse', 'Services and wage pass-through decide policy confidence.'],
      ],
      markets: [
        ['Rates', 'Small policy changes can have large FX effects through hedging costs.'],
        ['FX', 'JPY strengthens when US yields fall or BoJ confidence rises.'],
        ['Equities', 'Weak yen helps exporters, but domestic demand is a second leg.'],
      ],
      risks: [
        ['Policy', 'A cautious BoJ can extend currency weakness.'],
        ['Energy', 'Import prices remain relevant for real income.'],
        ['Global yields', 'JPY remains vulnerable when foreign yields rise.'],
      ],
    },
  },
]

const TABS = [
  { id: 'macro', label: 'Macro' },
  { id: 'markets', label: 'Markets' },
  { id: 'risks', label: 'Risks' },
]

function MetricCard({ icon: Icon, label, value, sublabel, tone = 'default' }) {
  const toneClass = {
    positive: 'text-[#4ade80]',
    warning: 'text-[#f59e0b]',
    negative: 'text-[#ef4444]',
    info: 'text-[#60a5fa]',
    default: 'text-white',
  }[tone]

  return (
    <div className="border border-[#222] bg-[#050505] p-3 min-h-[92px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#555]">{label}</div>
          <div className={`mt-1 font-mono text-xl font-bold ${toneClass}`}>{value}</div>
        </div>
        <Icon size={18} className="text-[#555] shrink-0" />
      </div>
      <div className="mt-2 text-[11px] leading-snug text-[#777]">{sublabel}</div>
    </div>
  )
}

function ScoreBar({ label, value, tone }) {
  const color = tone === 'stress' ? 'bg-[#f59e0b]' : 'bg-[#4ade80]'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#555]">
        <span>{label}</span>
        <span className="font-mono text-[#888]">{value}/100</span>
      </div>
      <div className="h-2 border border-[#222] bg-black">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function GeneralPage() {
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code)
  const [activeTab, setActiveTab] = useState('macro')

  const country = useMemo(
    () => COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0],
    [countryCode],
  )

  return (
    <div className="pt-12 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#555]">Country intelligence</div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">General</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Pais</span>
              <select
                value={countryCode}
                onChange={(event) => {
                  setCountryCode(event.target.value)
                  setActiveTab('macro')
                }}
                className="h-9 min-w-[210px] appearance-none border border-[#333] bg-black px-3 pr-9 text-sm font-bold text-white outline-none focus:border-[#ecd987]"
              >
                {COUNTRIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    [{item.flag}] {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#777]" />
            </label>
            <div className="border border-[#333] px-3 py-2 text-[10px] uppercase tracking-widest text-[#777]">
              Snapshot modelado
            </div>
          </div>
        </div>

        <section className="mb-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Resumen del pais</span>
            </div>
            <div className="grid gap-0 md:grid-cols-[260px_1fr]">
              <div className="border-b border-[#222] p-4 md:border-b-0 md:border-r">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex h-14 w-14 items-center justify-center border-2 border-[#333] font-mono text-xl font-bold text-[#ecd987]">
                      {country.flag}
                    </div>
                    <h2 className="mt-3 text-xl font-bold uppercase tracking-widest text-white">{country.name}</h2>
                    <div className="mt-1 text-xs uppercase tracking-widest text-[#777]">
                      {country.region} / {country.currency}
                    </div>
                  </div>
                  <Globe2 size={24} className="text-[#555]" />
                </div>

                <div className="mt-5 space-y-3">
                  <ScoreBar label="Momentum macro" value={country.momentum} />
                  <ScoreBar label="Stress monitor" value={country.stress} tone="stress" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="border border-[#222] p-2">
                    <div className="uppercase tracking-widest text-[#555]">Capital</div>
                    <div className="mt-1 text-[#aaa]">{country.capital}</div>
                  </div>
                  <div className="border border-[#222] p-2">
                    <div className="uppercase tracking-widest text-[#555]">Rating</div>
                    <div className="mt-1 font-mono text-[#ecd987]">{country.sovereignRating}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={Banknote} label="GDP nominal" value={country.gdp} sublabel="Tamano aproximado de la economia." tone="info" />
                <MetricCard icon={TrendingUp} label="GDP real" value={country.gdpGrowth} sublabel="Crecimiento anual estimado." tone="positive" />
                <MetricCard icon={Activity} label="Inflacion" value={country.inflation} sublabel="Presion de precios general." tone="warning" />
                <MetricCard icon={Landmark} label="Policy rate" value={country.policyRate} sublabel="Ancla de tipos oficiales." />
                <MetricCard icon={BriefcaseBusiness} label="Paro" value={country.unemployment} sublabel="Slack laboral observado." />
                <MetricCard icon={Users} label="Poblacion" value={country.population} sublabel="Base demografica." />
                <MetricCard icon={ShieldAlert} label="Balance fiscal" value={country.fiscalBalance} sublabel="Deficit/superavit sobre GDP." tone="negative" />
                <MetricCard icon={PackageOpen} label="Cuenta corriente" value={country.currentAccount} sublabel={country.trade} tone="info" />
              </div>
            </div>
          </div>

          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Lectura operativa</span>
            </div>
            <div className="p-4">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  ['Regimen', country.regime, LineChart],
                  ['FX bias', country.fxBias, Banknote],
                  ['Riesgo clave', country.risk, ShieldAlert],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="border border-[#222] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase tracking-widest text-[#555]">{label}</div>
                      <Icon size={16} className="text-[#555]" />
                    </div>
                    <div className="text-sm font-bold uppercase tracking-wider text-white">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border border-[#222]">
                <div className="border-b border-[#222] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#777]">
                  Narrative checks
                </div>
                <div className="divide-y divide-[#111]">
                  {country.narrative.map((item) => (
                    <div key={item} className="flex gap-3 px-3 py-2 text-xs leading-relaxed text-[#aaa]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Indicadores principales</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <thead>
                  <tr className="bg-[#111] text-left">
                    <th className="w-[28%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Indicator</th>
                    <th className="w-[12%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Units</th>
                    {['Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26'].map((quarter) => (
                      <th key={quarter} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#555]">{quarter}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {country.indicators.map(([name, units, ...values]) => (
                    <tr key={name} className="border-t border-[#111] hover:bg-[#0a0a0a]">
                      <td className="px-3 py-2 font-bold text-[#ddd]">{name}</td>
                      <td className="px-3 py-2 font-mono text-[#777]">{units}</td>
                      {values.map((value, index) => (
                        <td key={`${name}-${index}`} className="px-3 py-2 text-right font-mono text-white">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Detalle por tabs</span>
            </div>
            <div className="border-b border-[#222] p-2">
              <div className="grid grid-cols-3 gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest ${
                      activeTab === tab.id
                        ? 'border border-[#ecd987] text-[#ecd987]'
                        : 'border border-[#222] text-[#666] hover:border-[#555] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-[#111]">
              {country.tabs[activeTab].map(([label, text]) => (
                <div key={label} className="p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Factory size={14} className="text-[#555]" />
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{label}</div>
                  </div>
                  <p className="text-xs leading-relaxed text-[#aaa]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
