import { Link } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { pipelineStages } from '../data/modules'

export default function PipelineFlow() {
  const { activeModule, setActiveModule, clearActiveModule } = useAppStore()

  const handleEnter = (id) => setActiveModule(id)
  const handleLeave = () => clearActiveModule()

  return (
    <section id="pipeline" className="py-12 border-b-2 border-[#333]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <div className="text-sm text-[#555] uppercase tracking-widest mb-2">
            Flujo de Datos
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
            Pipeline FX Macro
          </h2>
          <p className="text-sm text-[#888]">
            Flujo end-to-end desde el regimen global hasta la ejecucion y feedback loop.
          </p>
        </div>

        {/* Main flow */}
        <div className="flex flex-col lg:flex-row items-start justify-start gap-0 mb-4">
          <StageCard stage={pipelineStages[0]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />

          <div className="hidden lg:flex items-center justify-center w-8 h-24">
            <span className="text-[#555] text-sm font-bold">{'->'}</span>
          </div>
          <div className="flex lg:hidden items-center justify-center h-8 w-full border-l-2 border-[#333] ml-6">
            <span className="text-[#555] text-sm font-bold">v</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-0 p-0 border-2 border-[#333] bg-black">
            <StageCard stage={pipelineStages[1]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />
            <div className="hidden sm:flex items-center justify-center w-8 h-24">
              <span className="text-[#555] text-sm font-bold">{'->'}</span>
            </div>
            <div className="flex sm:hidden items-center justify-center h-8 w-full border-l-2 border-[#333] ml-6">
              <span className="text-[#555] text-sm font-bold">v</span>
            </div>
            <StageCard stage={pipelineStages[2]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />
          </div>

          <div className="hidden lg:flex items-center justify-center w-8 h-24">
            <span className="text-[#555] text-sm font-bold">{'->'}</span>
          </div>
          <div className="flex lg:hidden items-center justify-center h-8 w-full border-l-2 border-[#333] ml-6">
            <span className="text-[#555] text-sm font-bold">v</span>
          </div>

          <StageCard stage={pipelineStages[3]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />

          <div className="hidden lg:flex items-center justify-center w-8 h-24">
            <span className="text-[#555] text-sm font-bold">{'->'}</span>
          </div>
          <div className="flex lg:hidden items-center justify-center h-8 w-full border-l-2 border-[#333] ml-6">
            <span className="text-[#555] text-sm font-bold">v</span>
          </div>

          <StageCard stage={pipelineStages[4]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />

          <div className="hidden lg:flex items-center justify-center w-8 h-24">
            <span className="text-[#555] text-sm font-bold">{'->'}</span>
          </div>
          <div className="flex lg:hidden items-center justify-center h-8 w-full border-l-2 border-[#333] ml-6">
            <span className="text-[#555] text-sm font-bold">v</span>
          </div>

          <StageCard stage={pipelineStages[5]} activeModule={activeModule} onEnter={handleEnter} onLeave={handleLeave} />
        </div>

        {/* Feedback Loop */}
        <div className="relative flex flex-col items-start gap-0 p-4 border-2 border-dashed border-[#555] bg-black mt-4">
          <div className="absolute -top-2 left-6 w-4 h-2 bg-black" />
          <StageCard
            stage={{ id: 'selfawareness', label: 'SELF-AWARENESS', part: 'VI', desc: 'Feedback loop continuo' }}
            activeModule={activeModule}
            onEnter={handleEnter}
            onLeave={handleLeave}
            isFeedback
          />
          <span className="font-mono text-sm text-[#555] tracking-wider mt-2">
            {'<-- FEEDBACK A TODOS LOS MODULOS <--'}
          </span>
        </div>
      </div>
    </section>
  )
}

function StageCard({ stage, activeModule, onEnter, onLeave, isFeedback }) {
  const isActive = activeModule === stage.id
  const isWorldView = stage.id === 'worldview'

  const cardContent = (
    <div className={`min-w-[140px] p-3 border-2 text-center ${
      isActive
        ? isFeedback
          ? 'border-white bg-[#111]'
          : 'border-[#B8A060] bg-[#111]'
        : 'border-[#333] bg-black hover:border-[#555]'
    }`}>
      <div className="font-mono text-sm text-[#555] mb-1">{stage.part}</div>
      <h4 className="text-sm font-bold text-white uppercase tracking-wider">{stage.label}</h4>
      <p className="text-sm text-[#555] mt-1">{stage.desc}</p>
    </div>
  )

  if (isWorldView) {
    return (
      <div
        className="cursor-pointer"
        onMouseEnter={() => onEnter(stage.id)}
        onMouseLeave={onLeave}
      >
        <Link to="/world-view" className="block">
          {cardContent}
        </Link>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer"
      onMouseEnter={() => onEnter(stage.id)}
      onMouseLeave={onLeave}
      onClick={() => {
        const el = document.getElementById(`card-${stage.id}`)
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' })
      }}
    >
      {cardContent}
    </div>
  )
}





