import { Link } from 'react-router-dom'

const navigationGroups = [
  {
    title: 'Analisis',
    items: [
      ['/general', 'General'],
      ['/world-view', 'World View'],
      ['/endogenous', 'Endogenous'],
      ['/exogenous/operativa', 'Exogenous'],
      ['/emerging-markets', 'Emerging Markets'],
      ['/trade', 'Trade Monitor'],
      ['/fx-trend-layer', 'G10 FX Trend'],
      ['/equities-macro-layer', 'G11 Equities Macro'],
      ['/macro-nowcasting', 'G12 Nowcasting'],
    ],
  },
  {
    title: 'Ejecucion',
    items: [
      ['/timing/operativa', 'Timing'],
      ['/risk/operativa', 'Risk'],
      ['/execution/operativa', 'Execution'],
      ['/fiscal', 'G3 Fiscal'],
      ['/disaster-recovery', 'G6 Recovery'],
      ['/tail-risk', 'G7 Tail Risk'],
      ['/counterparty-risk', 'G8 Counterparty'],
      ['/multi-broker', 'G13 Multi-Broker'],
    ],
  },
  {
    title: 'Aprendizaje',
    items: [
      ['/journal', 'Journal'],
      ['/performance', 'Performance'],
      ['/backtest', 'Backtest'],
      ['/scenario-library', 'Scenarios'],
      ['/capital-allocation', 'Capital'],
      ['/behavioral-finance', 'G9 Behavioral'],
      ['/model-governance', 'G15 Governance'],
      ['/decision-log', 'G16 Decision Log'],
      ['/knowledge-transfer', 'G17 Knowledge'],
      ['/external-validation', 'G18 Validation'],
    ],
  },
  {
    title: 'Data',
    items: [
      ['/data', 'Data Hub'],
      ['/data/raw', 'Raw'],
      ['/data/coverage-matrix', 'Coverage'],
      ['/data/history', 'History'],
      ['/data/economic-calendar', 'Calendar'],
      ['/data/notifications', 'Notifications'],
    ],
  },
]

const coreFlow = [
  ['/world-view', 'World View'],
  ['/endogenous', 'Endogenous'],
  ['/exogenous/operativa', 'Exogenous'],
  ['/timing/operativa', 'Timing'],
  ['/risk/operativa', 'Risk'],
  ['/execution/operativa', 'Execution'],
  ['/journal', 'Self-Awareness'],
]

const layers = [
  {
    title: 'Core FX Macro',
    nodes: [
      ['/world-view', 'World View'],
      ['/endogenous', 'Endogenous'],
      ['/exogenous/operativa', 'Exogenous'],
    ],
  },
  {
    title: 'Capas',
    nodes: [
      ['/fx-trend-layer', 'G10 FX Trend'],
      ['/equities-macro-layer', 'G11 Equities Macro'],
      ['/macro-nowcasting', 'G12 Nowcasting'],
    ],
  },
  {
    title: 'Riesgo / Operativa',
    nodes: [
      ['/fiscal', 'G3 Fiscal'],
      ['/disaster-recovery', 'G6 Recovery'],
      ['/tail-risk', 'G7 Tail Risk'],
      ['/counterparty-risk', 'G8 Counterparty'],
      ['/multi-broker', 'G13 Multi-Broker'],
    ],
  },
  {
    title: 'Gobierno',
    nodes: [
      ['/behavioral-finance', 'G9 Behavioral'],
      ['/model-governance', 'G15 Governance'],
      ['/decision-log', 'G16 Decision Log'],
      ['/knowledge-transfer', 'G17 Knowledge'],
      ['/external-validation', 'G18 Validation'],
    ],
  },
]

function NodeLink({ to, children, tone = 'default' }) {
  const tones = {
    default: 'border-[#333] text-[#ddd] hover:border-[#ecd987] hover:text-[#ecd987]',
    core: 'border-[#ecd987] text-[#ecd987]',
    data: 'border-[#60a5fa] text-[#60a5fa]',
  }

  return (
    <Link
      to={to}
      className={`block border bg-black px-3 py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
        tones[tone] || tones.default
      }`}
    >
      {children}
    </Link>
  )
}

function Section({ title, children }) {
  return (
    <section className="border-2 border-[#333] bg-[#050505]">
      <header className="border-b-2 border-[#333] px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-black pt-16 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#333] pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[#777]">Mapa visual</p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-wider">Info</h1>
          </div>
          <NodeLink to="/dashboard" tone="core">Dashboard</NodeLink>
        </header>

        <div className="space-y-6">
          <Section title="Mapa De La App">
            <div className="grid gap-4 lg:grid-cols-4">
              {navigationGroups.map((group) => (
                <div key={group.title} className="border border-[#222] bg-black p-3">
                  <div className="mb-3 border-b border-[#222] pb-2 text-center text-xs font-black uppercase tracking-widest text-[#ecd987]">
                    {group.title}
                  </div>
                  <div className="grid gap-2">
                    {group.items.map(([to, label]) => (
                      <NodeLink key={to} to={to} tone={group.title === 'Data' ? 'data' : 'default'}>
                        {label}
                      </NodeLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Flujo Principal">
            <div className="grid items-center gap-2 md:grid-cols-[repeat(13,minmax(0,1fr))]">
              {coreFlow.map(([to, label], index) => (
                <div key={to} className="contents">
                  <NodeLink to={to} tone={index === 0 ? 'core' : 'default'}>
                    {label}
                  </NodeLink>
                  {index < coreFlow.length - 1 && (
                    <div className="hidden text-center font-mono text-lg text-[#555] md:block">-&gt;</div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Capas Y Modulos">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {layers.map((layer) => (
                <div key={layer.title} className="border border-[#222] bg-black p-3">
                  <div className="mb-3 border-b border-[#222] pb-2 text-center text-xs font-black uppercase tracking-widest text-[#888]">
                    {layer.title}
                  </div>
                  <div className="grid gap-2">
                    {layer.nodes.map(([to, label]) => (
                      <NodeLink key={to} to={to}>{label}</NodeLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </main>
  )
}
