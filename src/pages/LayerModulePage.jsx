import { Link } from 'react-router-dom'
import { BookOpen, Clock, FileText, GitBranch, Layers, ShieldAlert } from 'lucide-react'

const MODULES = {
  fxTrend: {
    code: 'G10',
    title: 'Capa 2 - FX Trend Layer',
    subtitle: 'Overlay tecnico-direccional para desplegar una segunda capa sobre senales FX ya validadas.',
    horizon: 'Proyecto de meses',
    fileCount: 13,
    docsPath: 'Documentation/04_CAPAS_Adicionales/FX_Trend_Layer_Module',
    status: 'Roadmap',
    accent: 'text-[#60a5fa]',
    border: 'border-[#60a5fa]',
    inputs: [
      'Senal FX de Capa 1 con conviccion suficiente',
      'Filtros de activacion por regimen y volatilidad',
      'Setups tecnicos, momentum y estructura de tendencia',
    ],
    outputs: [
      'Decision de activar o no Capa 2',
      'Sizing incremental y reglas de salida propias',
      'Metricas separadas para evaluar valor anadido',
    ],
    files: [
      '01 Filosofia y diferencias vs Capa 1',
      '02 Filtros de activacion',
      '03 Setups tecnicos de entry',
      '04 Position sizing Capa 2',
      '05 Reglas de salida especificas',
      '06 Actualizacion dinamica de beta',
      '07 Pipeline Capa 2',
      '08 Metricas esperadas',
      '09 Circuit breakers especificos',
      '10 Integracion con otros modulos',
      '11 Activacion de Capa 2',
      '12 Parametros default',
      '13 Errores especificos a evitar',
    ],
  },
  equitiesMacro: {
    code: 'G11',
    title: 'Capa 3 - Equities Macro Layer',
    subtitle: 'Extension cross-asset para traducir drivers macro FX a exposicion equity seleccionada.',
    horizon: 'Proyecto de meses',
    fileCount: 14,
    docsPath: 'Documentation/04_CAPAS_Adicionales/Equities_Macro_Layer_Module',
    status: 'Roadmap',
    accent: 'text-[#4ade80]',
    border: 'border-[#4ade80]',
    inputs: [
      'World View y scores macro por bloque',
      'Mapeo driver macro a indice, sector o instrumento',
      'Costes, liquidez y correlacion con FX existente',
    ],
    outputs: [
      'Score macro para equities',
      'Universo de instrumentos elegibles',
      'Sizing Capa 3 y control de correlacion triple',
    ],
    files: [
      '01 Filosofia y diferencias vs FX',
      '02 Universo de instrumentos',
      '03 Mapeo driver macro a instrumento',
      '04 Construccion del score para equities',
      '05 Position sizing Capa 3',
      '06 Costes y operativa especifica',
      '07 Pipeline Capa 3',
      '08 Metricas esperadas',
      '09 Circuit breakers Capa 3',
      '10 Activacion de Capa 3',
      '11 Riesgo de correlacion triple',
      '12 Parametros default',
      '13 Errores especificos Capa 3',
      '14 Integracion con otros modulos',
    ],
  },
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="border-2 border-[#333]">
      <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5 flex items-center gap-2">
        <Icon size={15} className="text-[#ecd987]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function LayerModulePage({ moduleKey }) {
  const mod = MODULES[moduleKey]

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`mb-1 text-[10px] font-bold uppercase tracking-[0.28em] ${mod.accent}`}>{mod.code}</div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">{mod.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#888]">{mod.subtitle}</p>
          </div>
          <div className={`border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            {mod.status} / {mod.horizon}
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          {[
            ['Archivos', mod.fileCount, FileText],
            ['Horizonte', mod.horizon, Clock],
            ['Estado', mod.status, ShieldAlert],
            ['Capa', mod.code, Layers],
          ].map(([label, value, Icon]) => (
            <div key={label} className="border border-[#333] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-widest text-[#555]">{label}</span>
                <Icon size={16} className="text-[#555]" />
              </div>
              <div className="font-mono text-lg font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Contrato del modulo" icon={GitBranch}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-[#222] p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#777]">Inputs</div>
                <ul className="space-y-2">
                  {mod.inputs.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#aaa]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-[#222] p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#777]">Outputs</div>
                <ul className="space-y-2">
                  {mod.outputs.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#aaa]">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Documentacion" icon={BookOpen}>
            <div className="mb-3 border border-[#222] p-3">
              <div className="text-[10px] uppercase tracking-widest text-[#555]">Ruta</div>
              <div className="mt-1 break-all font-mono text-xs text-[#aaa]">{mod.docsPath}</div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {mod.files.map((file, index) => (
                <div key={file} className="flex items-start gap-2 border border-[#222] px-2 py-1.5 text-xs text-[#aaa]">
                  <span className={`font-mono ${mod.accent}`}>{String(index + 1).padStart(2, '0')}</span>
                  <span>{file}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Este modulo esta registrado en la app como bloque nuevo, pero no ejecuta aun logica de trading ni datos propios.
          La implementacion completa requiere desarrollar pipeline, datos, scoring, controles de riesgo y metricas dedicadas.
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
