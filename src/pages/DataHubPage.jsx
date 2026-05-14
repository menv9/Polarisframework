import { Link } from 'react-router-dom'

const cards = [
  {
    title: 'Notifications',
    path: '/data/notifications',
    tone: 'text-[#ef4444] border-[#ef4444]',
    desc: 'Inbox operativo: vencidos, proximos, releases nuevos y acciones sugeridas.',
    meta: 'Data alerts',
  },
  {
    title: 'Source Registry',
    path: '/data/raw',
    tone: 'text-[#4ade80] border-[#4ade80]',
    desc: 'Registro de fuentes: endpoint, latest value, refresh, estado, fit exacto/proxy/manual y metadata.',
    meta: 'Fuentes y latest',
  },
  {
    title: 'Coverage Matrix',
    path: '/data/coverage-matrix',
    tone: 'text-[#60a5fa] border-[#60a5fa]',
    desc: 'Mapa maestro de datos necesarios por modulo y cobertura real frente a la documentacion.',
    meta: 'Necesidad vs cobertura',
  },
  {
    title: 'History Pipeline',
    path: '/data/history',
    tone: 'text-[#ecd987] border-[#ecd987]',
    desc: 'Ingesta de historicos, estado OK/error, observaciones, start/end y vista por indicador.',
    meta: 'Historico raw',
  },
  {
    title: 'Economic Calendar',
    path: '/data/economic-calendar',
    tone: 'text-[#ef4444] border-[#ef4444]',
    desc: 'Calendario macro con auto-sync, releases guardados y barrera dura frente al modelo.',
    meta: 'Releases macro',
  },
  {
    title: 'Model Features',
    path: '/model-inputs',
    tone: 'text-[#f59e0b] border-[#f59e0b]',
    desc: 'Transformaciones, z-scores y features internas calculadas desde los historicos.',
    meta: 'Z-scores del modelo',
  },
]

export default function DataHubPage() {
  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="mb-4 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Data Center</h1>
          <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
            Centro de gestion de datos: fuentes, cobertura, historicos y features.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className={`block border-2 ${card.tone} p-4 bg-[#080808] hover:bg-[#111] hover:border-white hover:text-white transition-colors min-h-[150px]`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold uppercase tracking-widest">{card.title}</div>
                  <div className="text-[10px] text-[#777] uppercase tracking-wider mt-1">{card.meta}</div>
                </div>
                <div className="text-2xl font-bold">→</div>
              </div>
              <p className="mt-5 text-sm text-[#aaa] leading-relaxed">{card.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-5 border-2 border-[#333] bg-[#0a0a0a] p-4">
          <div className="text-sm font-bold uppercase tracking-widest text-white mb-2">Flujo recomendado</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-[#222]">
            <Step label="1. Source Registry" text="Conectar y validar fuentes externas." />
            <Step label="2. Coverage" text="Ver que datos exige el framework." />
            <Step label="3. History" text="Guardar historicos persistentes." />
            <Step label="4. Calendar" text="Archivar releases macro sin tocar el modelo." />
            <Step label="5. Model Features" text="Crear features y z-scores." />
          </div>
        </div>

        <div className="mt-5 border-2 border-[#333] bg-[#080808]">
          <div className="px-4 py-3 border-b-2 border-[#333]">
            <div className="text-sm font-bold uppercase tracking-widest text-white">Contrato de datos</div>
            <div className="text-[10px] text-[#777] uppercase tracking-wider mt-1">
              El framework consume Model Features. Las otras capas conectan, auditan y persisten.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-0">
            <ContractStep
              label="Source Registry"
              output="Fuente + fit"
              text="Endpoint, latest value, exact/derived/proxy/manual y metadata."
            />
            <ContractStep
              label="Coverage Matrix"
              output="Usabilidad"
              text="Comprueba cobertura, comparabilidad y transformacion esperada."
            />
            <ContractStep
              label="History Pipeline"
              output="Historico canonico"
              text="Series persistidas por source_id, sin features finales."
            />
            <ContractStep
              label="Economic Calendar"
              output="Release log"
              text="Eventos macro guardados aparte; no alimentan fuentes ni features."
            />
            <ContractStep
              label="Model Features"
              output="Senal normalizada"
              text="Z-score, percentil, spread o estado listo para modelo."
            />
            <ContractStep
              label="Framework"
              output="Decision"
              text="Consume feature_value, no valores raw mezclados."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ label, text }) {
  return (
    <div className="p-3 border-r border-b md:border-b-0 border-[#222]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{label}</div>
      <div className="text-xs text-[#888] mt-2 leading-tight">{text}</div>
    </div>
  )
}

function ContractStep({ label, output, text }) {
  return (
    <div className="p-3 border-r border-b md:border-b-0 border-[#222] min-h-[120px]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{label}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-white mt-2">{output}</div>
      <div className="text-xs text-[#888] mt-2 leading-tight">{text}</div>
    </div>
  )
}
