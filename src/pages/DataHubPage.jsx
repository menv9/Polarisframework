import { Link } from 'react-router-dom'

const SUBSYSTEMS = [
  {
    title: 'Notifications',
    path: '/data/notifications',
    colorClass: 'text-[#ef4444]',
    meta: 'Data alerts',
    desc: 'Inbox operativo: vencidos, proximos, releases nuevos y acciones sugeridas.',
  },
  {
    title: 'Source Registry',
    path: '/data/raw',
    colorClass: 'text-[#4ade80]',
    meta: 'Fuentes y latest',
    desc: 'Registro de fuentes: endpoint, latest value, refresh, estado, fit exacto/proxy/manual y metadata.',
  },
  {
    title: 'Coverage Matrix',
    path: '/data/coverage-matrix',
    colorClass: 'text-[#60a5fa]',
    meta: 'Necesidad vs cobertura',
    desc: 'Mapa maestro de datos necesarios por modulo y cobertura real frente a la documentacion.',
  },
  {
    title: 'History Pipeline',
    path: '/data/history',
    colorClass: 'text-[#ecd987]',
    meta: 'Historico raw',
    desc: 'Ingesta de historicos, estado OK/error, observaciones, start/end y vista por indicador.',
  },
  {
    title: 'Economic Calendar',
    path: '/data/economic-calendar',
    colorClass: 'text-[#ef4444]',
    meta: 'Releases macro',
    desc: 'Calendario macro con auto-sync, releases guardados y barrera dura frente al modelo.',
  },
  {
    title: 'Model Features',
    path: '/model-inputs',
    colorClass: 'text-[#f59e0b]',
    meta: 'Z-scores del modelo',
    desc: 'Transformaciones, z-scores y features internas calculadas desde los historicos.',
  },
]

const CONTRACT = [
  { label: 'Source Registry',   output: 'Fuente + fit',          text: 'Endpoint, latest value, exact/derived/proxy/manual y metadata.' },
  { label: 'Coverage Matrix',   output: 'Usabilidad',            text: 'Comprueba cobertura, comparabilidad y transformacion esperada.' },
  { label: 'History Pipeline',  output: 'Historico canonico',    text: 'Series persistidas por source_id, sin features finales.' },
  { label: 'Economic Calendar', output: 'Release log',           text: 'Eventos macro guardados aparte; no alimentan fuentes ni features.' },
  { label: 'Model Features',    output: 'Senal normalizada',     text: 'Z-score, percentil, spread o estado listo para modelo.' },
  { label: 'Framework',         output: 'Decision',              text: 'Consume feature_value, no valores raw mezclados.' },
]

export default function DataHubPage() {
  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Data Center</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Gestión de datos — Fuentes · Cobertura · Historicos · Features</p>
          </div>
        </div>

        {/* Subsystems */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Subsistemas</span>
          </div>
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-[#222] text-left text-[#444]">
                <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[22%]">Módulo</th>
                <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[20%]">Función</th>
                <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">Descripción</th>
                <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[5%]">→</th>
              </tr>
            </thead>
            <tbody>
              {SUBSYSTEMS.map((s) => (
                <tr key={s.path} className="border-b border-[#111] hover:bg-[#0a0a0a] transition-colors group">
                  <td className="px-3 py-2">
                    <Link to={s.path} className={`text-xs font-bold uppercase tracking-wider ${s.colorClass} group-hover:text-white`}>
                      {s.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] text-[#555] uppercase tracking-wider">{s.meta}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[#777]">{s.desc}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Link to={s.path} className="text-[#444] hover:text-[#ecd987] text-xs font-bold">→</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Flujo recomendado */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Flujo Recomendado</span>
          </div>
          <div className="grid grid-cols-5 gap-0">
            {['Source Registry', 'Coverage Matrix', 'History Pipeline', 'Economic Calendar', 'Model Features'].map((label, i) => (
              <div key={label} className={`p-3 ${i < 4 ? 'border-r' : ''} border-[#222]`}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987] mb-1">{i + 1}. {label}</div>
                <div className="text-[10px] text-[#555] leading-tight">
                  {[
                    'Conectar y validar fuentes externas.',
                    'Ver qué datos exige el framework.',
                    'Guardar historicos persistentes.',
                    'Archivar releases macro.',
                    'Crear features y z-scores.',
                  ][i]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contrato de datos */}
        <div className="border-2 border-[#333]">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Contrato de Datos</span>
            <span className="ml-3 text-[10px] text-[#555]">El framework consume Model Features — las otras capas conectan, auditan y persisten</span>
          </div>
          <div className="grid grid-cols-6 gap-0">
            {CONTRACT.map((c, i) => (
              <div key={c.label} className={`p-3 ${i < 5 ? 'border-r' : ''} border-[#222]`}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987] mb-1">{c.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white mb-1.5">{c.output}</div>
                <div className="text-[10px] text-[#555] leading-tight">{c.text}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
