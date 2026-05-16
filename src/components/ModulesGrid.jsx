import { modules } from '../data/modules'
import ModuleCard from './ModuleCard'

export default function ModulesGrid() {
  return (
    <section id="modules" className="py-12 border-b-2 border-[#333]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <div className="text-sm text-[#777] uppercase tracking-widest mb-2">
            03_CAPA_1_FX_Macro
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-2">
            Modulos del Sistema
          </h2>
          <p className="text-sm text-[#888]">
            Cada modulo es una unidad independiente con inputs, outputs y parametros definidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border-2 border-[#333]">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </section>
  )
}





