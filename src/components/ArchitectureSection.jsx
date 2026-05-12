import { architecturePillars } from '../data/modules'

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-12 border-b-2 border-[#333]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <div className="text-sm text-[#777] uppercase tracking-widest mb-2">
            Sistema
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
            Arquitectura del Framework
          </h2>
          <p className="text-sm text-[#888]">
            Disenado para robustez temporal (10+ anios), anti-overfitting y operativa real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-[#333] mb-8">
          {architecturePillars.map((pillar) => (
            <div
              key={pillar.title}
              className="p-4 border-r-2 border-b-2 border-[#333] bg-black"
            >
              <div className="text-sm font-bold text-[#777] tracking-widest uppercase mb-2">
                {pillar.icon.toUpperCase()}
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{pillar.title}</h4>
              <p className="text-sm text-[#888] leading-snug">{pillar.desc}</p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="max-w-3xl mx-auto p-6 border-2 border-[#333]">
          <blockquote className="text-sm font-bold text-white leading-relaxed uppercase tracking-wide">
            "Sin la capa de riesgo, el mejor sistema predictivo va a cero por ruina estadistica.
            Position sizing y stops son no-negociables, no parametros opcionales."
          </blockquote>
          <cite className="block mt-3 text-sm text-[#777] not-italic uppercase tracking-wider">
            — Polaris Framework, Parte V
          </cite>
        </div>
      </div>
    </section>
  )
}





