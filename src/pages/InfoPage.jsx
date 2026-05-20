import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'

const appMapDiagram = `flowchart TD
  APP["Polaris App"]

  APP --> PUBLIC["Publico"]
  PUBLIC --> LOGIN["/login<br/>Login"]

  APP --> PROTECTED["Area protegida"]
  PROTECTED --> HUB["Hub"]
  PROTECTED --> ANALYSIS["Analisis Macro"]
  PROTECTED --> EXECUTION["Ejecucion, Riesgo y Continuidad"]
  PROTECTED --> LEARNING["Aprendizaje, Gobierno y Validacion"]
  PROTECTED --> SETTINGS["/settings<br/>Settings"]

  APP --> ADMIN["Admin / Data"]

  HUB --> ROOT["/<br/>Redirect a /dashboard"]
  HUB --> DASH["/dashboard<br/>Dashboard de modulos"]

  ANALYSIS --> GENERAL["/general<br/>Pais en una pantalla"]
  ANALYSIS --> WV["/world-view<br/>World View"]
  ANALYSIS --> ENDO["/endogenous<br/>Endogenous Drivers"]
  ANALYSIS --> INPUTS["/model-inputs<br/>Model Inputs"]
  ANALYSIS --> ZSCORES["/endogenous/zscores<br/>Z-Scores"]
  ANALYSIS --> BETAS["/endogenous/betas<br/>Betas"]
  ANALYSIS --> EXO["/exogenous/operativa<br/>Exogenous Drivers"]
  ANALYSIS --> EM["/emerging-markets<br/>Emerging Markets"]
  ANALYSIS --> TRADE["/trade<br/>Global Trade Monitor"]
  ANALYSIS --> G10["/fx-trend-layer<br/>G10 FX Trend Layer"]
  ANALYSIS --> G11["/equities-macro-layer<br/>G11 Equities Macro Layer"]
  ANALYSIS --> G12["/macro-nowcasting<br/>G12 Macro Nowcasting"]

  EXECUTION --> TIMING["/timing/operativa<br/>Timing"]
  EXECUTION --> RISK["/risk/operativa<br/>Risk Management"]
  EXECUTION --> EXEC["/execution/operativa<br/>Execution & Costs"]
  EXECUTION --> G3["/fiscal<br/>G3 Modulo Fiscal"]
  EXECUTION --> G6["/disaster-recovery<br/>G6 Disaster Recovery"]
  EXECUTION --> G7["/tail-risk<br/>G7 Hedging / Tail Risk"]
  EXECUTION --> G8["/counterparty-risk<br/>G8 Counterparty Risk"]
  EXECUTION --> G13["/multi-broker<br/>G13 Multi-Broker"]

  LEARNING --> JOURNAL["/journal<br/>Trade Journal"]
  LEARNING --> PERF["/performance<br/>Performance"]
  LEARNING --> BACKTEST["/backtest<br/>Backtest"]
  LEARNING --> SCENARIOS["/scenario-library<br/>Scenario Library"]
  LEARNING --> CAPITAL["/capital-allocation<br/>Capital Allocation"]
  LEARNING --> G9["/behavioral-finance<br/>G9 Behavioral Finance"]
  LEARNING --> G15["/model-governance<br/>G15 Model Governance"]
  LEARNING --> G16["/decision-log<br/>G16 Decision Log"]
  LEARNING --> G17["/knowledge-transfer<br/>G17 Knowledge Transfer"]
  LEARNING --> G18["/external-validation<br/>G18 External Validation"]

  ADMIN --> ADMIN_PAGE["/admin<br/>Admin Panel"]
  ADMIN --> DATA["/data<br/>Data Hub"]
  DATA --> RAW["/data/raw<br/>Raw Data"]
  DATA --> COVERAGE["/data/coverage-matrix<br/>Coverage Matrix"]
  DATA --> HISTORY["/data/history<br/>History"]
  DATA --> HISTORY_DETAIL["/data/history/:sourceId<br/>History Series"]
  DATA --> CALENDAR["/data/economic-calendar<br/>Economic Calendar"]
  DATA --> NOTIFICATIONS["/data/notifications<br/>Notifications"]`

const frameworkFlowDiagram = `flowchart LR
  WV["World View<br/>/world-view"]
  ENDO["Endogenous<br/>/endogenous"]
  EXO["Exogenous<br/>/exogenous/operativa"]
  TIMING["Timing<br/>/timing/operativa"]
  RISK["Risk<br/>/risk/operativa"]
  EXEC["Execution<br/>/execution/operativa"]
  JOURNAL["Self-Awareness<br/>/journal"]

  WV --> ENDO
  WV --> EXO
  ENDO --> TIMING
  EXO --> TIMING
  TIMING --> RISK
  RISK --> EXEC
  EXEC --> JOURNAL
  JOURNAL -. feedback .-> WV
  JOURNAL -. feedback .-> ENDO
  JOURNAL -. feedback .-> RISK`

const layersDiagram = `flowchart TB
  CORE["Core FX Macro Framework"]

  CORE --> L1["Capa 1<br/>World View + Endogenous + Exogenous"]
  CORE --> L2["Capa 2<br/>G10 FX Trend Layer"]
  CORE --> L3["Capa 3<br/>G11 Equities Macro Layer"]

  CORE --> RISKOPS["Riesgo / Operativa"]
  RISKOPS --> FISCAL["G3 Fiscal"]
  RISKOPS --> DR["G6 Disaster Recovery"]
  RISKOPS --> TAIL["G7 Tail Risk"]
  RISKOPS --> COUNTER["G8 Counterparty"]
  RISKOPS --> MULTI["G13 Multi-Broker"]

  CORE --> GOVERNANCE["Gobierno / Mejora"]
  GOVERNANCE --> BEHAVIOR["G9 Behavioral Finance"]
  GOVERNANCE --> NOWCAST["G12 Macro Nowcasting"]
  GOVERNANCE --> MODEL["G15 Model Governance"]
  GOVERNANCE --> DECISION["G16 Decision Log"]
  GOVERNANCE --> KNOWLEDGE["G17 Knowledge Transfer"]
  GOVERNANCE --> VALIDATION["G18 External Validation"]`

const treeMap = `Polaris App
|
+-- Publico
|   \`-- /login                         Login
|
+-- Protegido
|   |
|   +-- Hub
|   |   +-- /                           Redirect a /dashboard
|   |   +-- /dashboard                  Dashboard de modulos
|   |   \`-- /settings                   Settings
|   |
|   +-- Analisis Macro
|   |   +-- /general                    Pais en una pantalla
|   |   +-- /world-view                 World View
|   |   +-- /endogenous                 Endogenous Drivers
|   |   +-- /model-inputs               Model Inputs
|   |   +-- /endogenous/zscores         Z-Scores
|   |   +-- /endogenous/betas           Betas
|   |   +-- /exogenous/operativa        Exogenous Drivers
|   |   +-- /emerging-markets           Emerging Markets
|   |   +-- /trade                      Global Trade Monitor
|   |   +-- /fx-trend-layer             G10 FX Trend Layer
|   |   +-- /equities-macro-layer       G11 Equities Macro Layer
|   |   \`-- /macro-nowcasting           G12 Macro Nowcasting Avanzado
|   |
|   +-- Ejecucion, Riesgo y Continuidad
|   |   +-- /timing/operativa           Timing
|   |   +-- /risk/operativa             Risk Management
|   |   +-- /execution/operativa        Execution & Costs
|   |   +-- /fiscal                     G3 Modulo Fiscal
|   |   +-- /disaster-recovery          G6 Disaster Recovery / BCP
|   |   +-- /tail-risk                  G7 Hedging / Tail Risk
|   |   +-- /counterparty-risk          G8 Counterparty Risk
|   |   \`-- /multi-broker               G13 Multi-Broker / Multi-Account
|   |
|   \`-- Aprendizaje, Gobierno y Validacion
|       +-- /journal                    Trade Journal
|       +-- /performance                Performance
|       +-- /backtest                   Backtest
|       +-- /scenario-library           Scenario Library
|       +-- /capital-allocation         Capital Allocation
|       +-- /behavioral-finance         G9 Behavioral Finance
|       +-- /model-governance           G15 Model Governance / Audit Trail
|       +-- /decision-log               G16 Decision Log estrategico
|       +-- /knowledge-transfer         G17 Knowledge Transfer Protocol
|       \`-- /external-validation        G18 External Validation Framework
|
\`-- Admin / Data
    +-- /admin                          Admin Panel
    \`-- /data                           Data Hub
        +-- /data/raw                   Raw Data
        +-- /data/coverage-matrix       Coverage Matrix
        +-- /data/history               History
        +-- /data/history/:sourceId     History Series
        +-- /data/economic-calendar     Economic Calendar
        \`-- /data/notifications         Notifications`

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
  themeVariables: {
    background: '#050505',
    primaryColor: '#0a0a0a',
    primaryTextColor: '#f8f8f8',
    primaryBorderColor: '#ecd987',
    lineColor: '#777777',
    secondaryColor: '#111111',
    tertiaryColor: '#000000',
    fontFamily: 'Inter, ui-sans-serif, system-ui',
  },
})

function MermaidDiagram({ chart }) {
  const id = useId().replaceAll(':', '')
  const ref = useRef(null)
  const dragRef = useRef(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function updateZoom(nextZoom) {
    setZoom(Math.min(2.5, Math.max(0.45, nextZoom)))
  }

  function resetView() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    setOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    })
  }

  function stopDrag(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  function handleWheel(event) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    updateZoom(zoom + (event.deltaY > 0 ? -0.1 : 0.1))
  }

  useEffect(() => {
    let mounted = true

    async function renderDiagram() {
      try {
        setError('')
        const { svg } = await mermaid.render(`mermaid-${id}`, chart)
        if (mounted && ref.current) ref.current.innerHTML = svg
      } catch (err) {
        if (mounted) setError(err?.message || 'Mermaid render error')
      }
    }

    renderDiagram()
    return () => {
      mounted = false
    }
  }, [chart, id])

  return (
    <div className="border border-[#222] bg-[#050505]">
      <div className="flex items-center justify-end gap-2 border-b border-[#222] px-3 py-2">
        <button
          type="button"
          onClick={() => updateZoom(zoom - 0.15)}
          className="h-7 w-7 border border-[#333] text-sm font-bold text-[#ddd] hover:border-[#ecd987] hover:text-[#ecd987]"
          aria-label="Reducir zoom"
        >
          -
        </button>
        <span className="w-14 text-center font-mono text-xs text-[#777]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => updateZoom(zoom + 0.15)}
          className="h-7 w-7 border border-[#333] text-sm font-bold text-[#ddd] hover:border-[#ecd987] hover:text-[#ecd987]"
          aria-label="Aumentar zoom"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-7 border border-[#333] px-3 text-xs font-bold uppercase tracking-wider text-[#777] hover:border-[#ecd987] hover:text-[#ecd987]"
        >
          Reset
        </button>
      </div>

      {error ? (
        <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-red-300">{chart}</pre>
      ) : (
        <div
          className="h-[620px] cursor-grab overflow-hidden active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onWheel={handleWheel}
        >
          <div
            className="min-w-[900px] origin-top-left p-6 transition-transform duration-75 [&_svg]:mx-auto [&_svg]:max-w-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
            ref={ref}
          />
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="border-2 border-[#333] bg-black">
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
        <header className="mb-6 border-b-2 border-[#333] pb-4">
          <p className="font-mono text-xs uppercase tracking-widest text-[#777]">Mapa visual</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-wider">Info</h1>
        </header>

        <div className="space-y-6">
          <Section title="Mapa De La App">
            <MermaidDiagram chart={appMapDiagram} />
          </Section>

          <Section title="Arbol De Navegacion">
            <pre className="overflow-auto border border-[#222] bg-[#050505] p-4 font-mono text-xs leading-5 text-[#d7d7d7]">
              {treeMap}
            </pre>
          </Section>

          <Section title="Flujo Principal Del Framework">
            <MermaidDiagram chart={frameworkFlowDiagram} />
          </Section>

          <Section title="Capas Y Extensiones">
            <MermaidDiagram chart={layersDiagram} />
          </Section>
        </div>
      </div>
    </main>
  )
}
