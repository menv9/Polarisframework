import { Link, Navigate, useParams } from 'react-router-dom'
import { briefExtensionModules } from '../data/modules'

const modulesById = Object.fromEntries(
  briefExtensionModules.map((module) => [module.id, module])
)

export default function BriefExtensionModulePage({ moduleId: moduleIdProp }) {
  const { moduleId } = useParams()
  const resolvedModuleId = moduleIdProp || moduleId
  const module = modulesById[resolvedModuleId]

  if (!module) return <Navigate to="/dashboard" replace />

  return (
    <main className="min-h-screen bg-black text-white pt-16">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex text-xs font-bold uppercase tracking-widest text-[#777] hover:text-[#ecd987]"
        >
          {'<-'} Modulos
        </Link>

        <section className="border-2 border-[#333] bg-[#050505]">
          <header className="border-b-2 border-[#333] px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="border border-[#ecd987] px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#ecd987]">
                {module.part}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-[#555]">
                Pagina base
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              {module.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#888]">
              {module.tagline}
            </p>
          </header>

          <div className="px-5 py-6">
            <p className="max-w-3xl text-base leading-7 text-[#cfcfcf]">
              {module.description}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
