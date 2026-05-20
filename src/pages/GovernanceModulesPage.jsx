import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  ListChecks,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react'

// ── Shared components ────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`border-2 border-[#333] ${className}`}>
      <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5 flex items-center gap-2">
        <Icon size={15} className="text-[#ecd987]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">{title}</span>
      </div>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#aaa]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Pipeline({ steps, accent }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, i) => (
        <div key={step} className="min-h-[88px] border-b border-r border-[#222] p-3">
          <div className={`mb-2 font-mono text-[10px] font-bold ${accent}`}>{String(i + 1).padStart(2, '0')}</div>
          <div className="text-xs leading-relaxed text-[#aaa]">{step}</div>
        </div>
      ))}
    </div>
  )
}

function ParamTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px] table-fixed text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            <th className="w-[42%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Parametro</th>
            <th className="w-[24%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Default</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Rango</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([p, v, r]) => (
            <tr key={p} className="border-t border-[#111]">
              <td className="px-3 py-2 text-[#ddd]">{p}</td>
              <td className="px-3 py-2 font-mono text-white">{v}</td>
              <td className="px-3 py-2 font-mono text-[#777]">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#111]">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 text-xs leading-relaxed ${j === 0 ? 'font-bold text-[#ddd]' : 'text-[#aaa]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Module data ──────────────────────────────────────────────────────────────

const MODULES = {
  macroNowcasting: {
    code: 'G12',
    title: 'Macro Nowcasting Avanzado',
    subtitle: 'Lectura macro de alta frecuencia y deteccion de sorpresas frente a consenso para actualizar World View entre revisiones.',
    status: 'Documented / not automated',
    horizon: 'Continuo',
    accent: 'text-[#22d3ee]',
    border: 'border-[#22d3ee]',
    principle: 'El nowcasting no reemplaza el analisis formal de World View; lo actualiza entre revisiones. Cuando la sorpresa acumulada diverge del consenso en >1.5 sigma, la señal macro puede cambiar antes de que el dato oficial lo confirme. Reaccionar a datos individuales sin el score agregado es una fuente sistematica de sobreajuste.',
    input: 'PMIs flash, empleo, CPI, retail sales, jobless claims, GDP flash y datos de alta frecuencia por bloque economico (EEUU, Europa, China, EM).',
    output: 'Nowcast_Score por bloque, flag de revision amarillo/rojo, actualizacion de sesgo de World View y registro en Decision Log cuando cambia la señal.',
    dataSources: [
      ['PMI Manufacturero', 'Mensual flash', 'S&P Global', '0-2 dias'],
      ['PMI Servicios', 'Mensual flash', 'S&P Global', '0-2 dias'],
      ['NFP / Empleo', 'Mensual', 'BLS / Eurostat', '1-4 semanas'],
      ['CPI Adelantado', 'Mensual', 'Nacional', '2-4 semanas'],
      ['Retail Sales', 'Mensual', 'Nacional', '2-4 semanas'],
      ['Jobless Claims', 'Semanal', 'DOL', '1 semana'],
      ['GDP Flash', 'Trimestral', 'Nacional', 'T+30 dias'],
      ['Industrial Production', 'Mensual', 'Nacional', '3-4 semanas'],
    ],
    scoreRules: [
      'Sorpresa_i = (Actual_i − Consenso_i) / StdDev_historico_i (ventana 24 meses)',
      'Nowcast_Score = Σ(w_i × Sorpresa_i) agrupado por bloque: actividad, inflacion, empleo',
      '|Score| < 1.0 sigma → verde, sin accion requerida',
      '|Score| >= 1.0 sigma → flag amarillo, anotar en agenda de revision semanal',
      '|Score| >= 1.5 sigma → flag rojo, revision inmediata de sesgo de World View',
      'Revisiones de datos previos cuentan igual que el dato flash: recalcular con valor revisado',
      'Si cambia el sesgo de World View: registrar inmediatamente en Decision Log (G16)',
    ],
    pipeline: [
      'Registrar dato nuevo y consenso al publicarse el mismo dia.',
      'Calcular Sorpresa_i normalizada con StdDev de ventana 24 meses.',
      'Actualizar Nowcast_Score del bloque afectado (actividad, inflacion o empleo).',
      'Evaluar flag: <1.0 verde / >=1.0 amarillo / >=1.5 rojo.',
      'Si amarillo: anotar en agenda y revisar en el proximo ciclo semanal.',
      'Si rojo: revision inmediata de World View y actualizacion del sesgo de regimen.',
      'Si cambia la señal FX: registrar en Decision Log con contexto e hipotesis.',
    ],
    parameters: [
      ['Umbral flag amarillo', '1.0 sigma', '0.75 - 1.25'],
      ['Umbral flag rojo', '1.5 sigma', '1.25 - 2.0'],
      ['Ventana StdDev historico', '24 meses', '18 - 36'],
      ['Peso bloque actividad (PMI + IP + GDP)', '35%', '25% - 45%'],
      ['Peso bloque empleo', '30%', '20% - 40%'],
      ['Peso bloque inflacion', '25%', '20% - 35%'],
      ['Peso otros (retail, sentiment)', '10%', '5% - 15%'],
      ['Frecuencia revision formal', 'Semanal', 'Diaria - Quincenal'],
    ],
    errors: [
      'Reaccionar a un dato individual sin calcular el score agregado del bloque.',
      'Ignorar revisiones de datos anteriores — cuentan igual que el dato flash.',
      'Cubrir solo EEUU; los bloques Europa, China y EM son igualmente necesarios.',
      'Confundir sorpresa positiva con señal alcista sin verificar el regimen macro de fondo.',
      'Actualizar la señal FX sin registrarlo en Decision Log.',
      'Saltarse la revision semanal cuando no hay datos "importantes" esa semana.',
    ],
  },

  behavioralFinance: {
    code: 'G9',
    title: 'Behavioral Finance / Psicologia del Operador',
    subtitle: 'Disciplina, sesgos y control del estado del operador como variable del sistema.',
    status: 'Documented / not automated',
    horizon: 'Continuo',
    accent: 'text-[#a78bfa]',
    border: 'border-[#a78bfa]',
    principle: 'El operador es una variable del sistema. Los mejores parametros y señales no sobreviven a un operador en modo reactivo, agotado o con P&L emocional. La disciplina no es opcional: es un circuit breaker mas, y el unico que el sistema no puede ejecutar automaticamente.',
    input: 'Journal, estado fisico y emocional, P&L actual vs limites semanales y mensuales, historial de errores recurrentes y drawdowns recientes.',
    output: 'Protocolos de autocontrol, bloqueos, cooldowns activos, metricas de disciplina y feed al protocolo de mejora continua de Self-Awareness.',
    biases: [
      ['Overconfidence', 'Sizing excesivo tras racha de ganadores', 'RPT > 1.5x default en 2 trades seguidos'],
      ['Revenge trading', 'Re-entrada rapida tras stop para recuperar', 'Nueva orden en <15 min post-stop'],
      ['Loss aversion', 'No cerrar posicion en stop porque "vuelve"', 'Stop superado >0.5R sin cierre'],
      ['Recency bias', 'Ignorar señal valida por perdida reciente similar', 'Override sin log documentado'],
      ['FOMO', 'Entrar sin setup por miedo a perder el movimiento', 'Ningun setup documentado en la entrada'],
      ['Anchoring', 'Decisiones referenciadas al precio de entrada, no al mercado', '"Precio de entrada" aparece en la justificacion'],
      ['Confirmation bias', 'Buscar solo fuentes que confirmen la tesis activa', 'Una sola fuente citada en el analisis'],
    ],
    preTradeChecklist: [
      'Estado fisico: ≥7h de sueño, sin sustancias que alteren el juicio.',
      'Estado emocional: escala 1-10, minimo 6 para operar.',
      'P&L semanal: si DD acumulado >50% del limite semanal, no operar.',
      'Setup presente: señal + filtros + timing todos confirmados antes de abrir orden.',
      'Sizing calculado y documentado antes de lanzar la orden.',
      'No hay ninguna posicion abierta pendiente de decision activa (no dividir la atencion).',
    ],
    postTradeRitual: [
      'Registrar resultado en Journal inmediatamente, no al final del dia.',
      'Clasificar: ganador-sistema / ganador-suerte / perdedor-sistema / perdedor-error.',
      'Si error: identificar el sesgo especifico del inventario.',
      'Si 3 errores del mismo tipo en 1 mes: activar protocolo de revision de ese sesgo.',
      'Verificar que el criterio de salida fue seguido exactamente; si no, documentar la desviacion.',
    ],
    cooldowns: [
      ['2 stops consecutivos en el dia', 'Pausa operativa', 'Resto del dia sin nuevas entradas'],
      ['DD semanal >50% del limite', 'Sizing −50%', 'Durante la semana siguiente completa'],
      ['Override sin log documentado', 'Revision inmediata obligatoria', 'Hasta justificar por escrito'],
      ['Estado emocional <6', 'No operar', 'Hasta recuperar nivel 7 o superior'],
      ['5 ganadores seguidos (overconfidence)', 'Revisar sizing antes del siguiente trade', 'Inmediata'],
      ['Trade de revenge identificado a posteriori', 'Pausa + log de sesgo', '24h minimo'],
    ],
    metrics: [
      ['Trades con setup documentado', '>95%', '<90% dispara alerta'],
      ['Override rate mensual', '<5%', '>10% dispara alerta'],
      ['Re-entries en <15 min post-stop', '0', '>2 en el mes dispara alerta'],
      ['Pre-trade checklist compliance', '>95%', '<85% dispara alerta'],
      ['Journal fill rate', '>95%', '<80% dispara alerta'],
      ['Dias operados con estado emocional <6', '0', '>1 en el mes dispara alerta'],
    ],
    pipeline: [
      'Check diario pre-mercado: estado fisico y emocional en escala 1-10.',
      'Revisar P&L actual vs limites semanal y mensual.',
      'Si condicion de cooldown activa: documentar y respetar sin excepciones.',
      'Completar pre-trade checklist antes de cada operacion.',
      'Ejecutar el trade segun la señal; no modificar el setup en caliente.',
      'Post-trade: registro inmediato en Journal con clasificacion y sesgo si aplica.',
      'Revision semanal: patron de errores y calculo de metricas de disciplina.',
    ],
    errors: [
      'Operar sin completar el pre-trade checklist.',
      'Justificar overrides como "intuicion" sin documentar el razonamiento.',
      'Ignorar el cooldown para "recuperar perdidas" — el cooldown existe exactamente para ese momento.',
      'Medir solo el P&L y olvidar las metricas de proceso (compliance, override rate, fill rate).',
      'Promediar una posicion perdedora porque "se que vuelve".',
      'No distinguir entre perdedor-sistema (correcto, el sistema fallo) y perdedor-error (evitable).',
    ],
  },

  decisionLog: {
    code: 'G16',
    title: 'Decision Log Estrategico',
    subtitle: 'Registro auditado de decisiones estructurales del framework con contexto, hipotesis y revision posterior.',
    status: 'Documented / not automated',
    horizon: 'Continuo',
    accent: 'text-[#818cf8]',
    border: 'border-[#818cf8]',
    principle: 'Toda decision que cambia el framework o la operativa debe quedar registrada con su contexto completo antes de ejecutarse. Sin log, el sistema pierde memoria institucional y no puede distinguir entre un cambio correcto y un ajuste reactivo a corto plazo que parecio buena idea en el momento.',
    input: 'Cambios de parametros, activaciones de modulo, pausas, nuevas hipotesis, overrides discrecionales y revisiones metodologicas.',
    output: 'Bitacora estrategica auditada con contexto, decision exacta, hipotesis, criterio de revision e impacto observado posterior.',
    categories: [
      ['Cambio de parametro', 'RPT, ATR multiplier, umbral sigma, pesos de scoring', 'Alta — log antes de ejecutar el cambio'],
      ['Activacion de modulo', 'Activar G10 Capa 2, G11 Capa 3, nuevo par elegible', 'Alta — log antes de operar'],
      ['Pausa de modulo', 'Pausar operativa por DD, regimen adverso o revision', 'Alta — log inmediato'],
      ['Nueva hipotesis macro', 'Nuevo driver en Endogenous, cambio de sesgo en World View', 'Media — antes de testear en vivo'],
      ['Cambio de universe', 'Agregar par, instrumento o contraparte elegible', 'Media — antes de operar'],
      ['Revision metodologica', 'Cambio en calculo z-score, scoring o pipeline', 'Alta — log + backtest previo requerido'],
      ['Override discrecional', 'No seguir la señal del sistema en un trade concreto', 'Alta — log antes del trade, no a posteriori'],
    ],
    templateFields: [
      'Timestamp exacto (fecha y hora)',
      'Categoria (de la tabla anterior)',
      'Modulo o componente afectado',
      'Descripcion exacta: que pasa de A a B (sin ambigüedad)',
      'Contexto: que lo detono, que estaba ocurriendo en el mercado o en el sistema',
      'Hipotesis: que se espera que mejore y por que (cuantificar si es posible)',
      'Valor anterior vs nuevo (si es cambio de parametro)',
      'Criterio de revision: cuando y como se evaluara (fecha y metrica)',
      'Estado: Activo / En revision / Cerrado',
      'Resultado posterior: rellenar en la fecha de revision, nunca al crear la entrada',
    ],
    reviewCadence: [
      ['Mensual', 'Revisar entradas del mes; actualizar estados; detectar patrones de cambio', 'Primer lunes del mes'],
      ['Trimestral', 'Revisar entradas "En revision" con fecha de criterio vencida', 'Inicio de trimestre'],
      ['Anual', 'Audit completo; archivar entradas cerradas; identificar patron anual de cambios', 'Primera semana de enero'],
    ],
    pipeline: [
      'Identificar que la decision es estructural (cambia algo permanente del sistema).',
      'Rellenar template completo antes de ejecutar el cambio; no al reves.',
      'Notificar en G17 Knowledge Transfer si el cambio afecta a runbooks operativos.',
      'Ejecutar el cambio con el log ya cerrado y timestamped.',
      'Marcar la fecha concreta del criterio de revision en el calendario.',
      'En la fecha de revision: rellenar resultado posterior con datos reales.',
      'Cerrar la entrada o escalar a G15 Model Governance si afecta a la metodologia.',
    ],
    errors: [
      'Hacer cambios de parametro "en caliente" sin log previo — aunque el cambio parezca trivial.',
      'Registrar solo los cambios exitosos y omitir los que fallaron o se revirtieron.',
      'No definir el criterio de revision al crear la entrada — sin criterio no hay aprendizaje.',
      'Confundir Decision Log (cambios del framework) con Trade Journal (operaciones individuales).',
      'Dejar entradas con estado "Activo" indefinidamente sin fecha de revision concreta.',
      'Usar lenguaje vago: "mejorar el sistema" no es una hipotesis; "reducir override rate de 12% a <5% en 3 meses" si lo es.',
    ],
  },

  knowledgeTransfer: {
    code: 'G17',
    title: 'Knowledge Transfer Protocol',
    subtitle: 'Documentacion, handoff y continuidad del conocimiento operativo del sistema.',
    status: 'Documented / not automated',
    horizon: 'Continuo',
    accent: 'text-[#60a5fa]',
    border: 'border-[#60a5fa]',
    principle: 'El sistema debe funcionar igual si el operador regresa despues de 3 meses de ausencia o si un segundo operador toma el relevo. Lo que no esta documentado no existe operativamente. Toda optimizacion de parametros que no esta en un runbook se pierde en la siguiente crisis o cambio de persona.',
    input: 'Runbooks, Decision Log (G16), parametros actuales, posiciones abiertas, accesos, calendario de eventos proximas 4 semanas y contactos de soporte.',
    output: 'Framework documentado y vivo, protocolo de onboarding estructurado, checklists de handoff y cadencia de mantenimiento documental.',
    documents: [
      ['Framework Master', 'Descripcion completa de modulos, logica y arquitectura del sistema', 'Cada cambio mayor de metodologia'],
      ['Runbook diario', 'Pasos exactos del ciclo operativo diario incluyendo decisiones', 'Cada cambio de proceso operativo'],
      ['Runbook de emergencia', 'Failover, broker caido, datos perdidos, accesos bloqueados', 'Tras cada incidente real; revision trimestral'],
      ['Parametros actuales', 'Tabla de todos los parametros en vigor con fecha del ultimo cambio', 'Inmediato tras cada cambio de parametro'],
      ['Decision Log (G16)', 'Registro de cambios estructurales del framework', 'Continuo'],
      ['Trade Journal', 'Registro de operaciones individuales con clasificacion', 'Continuo'],
      ['Backtest Registry', 'Resultados de validaciones formales con metodologia', 'Tras cada backtest ejecutado'],
      ['Onboarding Guide', 'Guia para nuevo operador o retorno de baja prolongada', 'Revision trimestral minimo'],
    ],
    runbookStructure: [
      'Objetivo: que cubre este runbook, cuando usarlo y quien es el responsable.',
      'Prerequisitos: accesos, herramientas, datos y estado del sistema requeridos antes de empezar.',
      'Pasos detallados y numerados sin ambigüedad — cada paso tiene un output verificable.',
      'Puntos de decision: si/no con criterio explicito (ej: "si DD >8%, ir al paso 9").',
      'Escalado: que hacer si algo falla o el output esperado no aparece.',
      'Contactos de emergencia: broker, datos, soporte tecnico con horarios disponibles.',
      'Version y fecha de ultima actualizacion al inicio del documento.',
    ],
    onboarding: [
      ['Semana 1', 'Lectura Framework Master completo + Decision Log de los ultimos 6 meses. Sin operar.'],
      ['Semana 2', 'Paper trading siguiendo el runbook operativo diario al pie de la letra. Log de dudas.'],
      ['Semana 3', 'Live con sizing al 25% del default. Revision diaria de cada decision tomada.'],
      ['Semana 4', 'Sizing al 50% si semana 3 sin errores de proceso. Revision semanal con el sistema.'],
      ['Mes 2+', 'Incremento gradual hasta full sizing. Criterio: 0 overrides sin log en 4 semanas consecutivas.'],
    ],
    handoffChecklist: [
      'Framework Master actualizado con fecha de ultima revision.',
      'Parametros actuales documentados con fecha del ultimo cambio.',
      'Decision Log sin entradas "Activo" sin fecha de revision asignada.',
      'Runbooks validados en los ultimos 3 meses.',
      'Accesos transferidos: broker, plataforma de datos, herramientas de la app.',
      'Posiciones abiertas documentadas con señal, stop, target y horizonte.',
      'Calendario de eventos proximas 4 semanas anotado con nivel de riesgo.',
      'Contactos de soporte actualizados y verificados.',
    ],
    maintenance: [
      ['Runbook diario', 'Revision mensual', 'Operador activo'],
      ['Runbook emergencia', 'Revision trimestral + simulacro real', 'Operador activo'],
      ['Framework Master', 'Revision semestral', 'Operador activo'],
      ['Onboarding Guide', 'Revision anual', 'Operador activo'],
      ['Parametros actuales', 'Inmediato tras cada cambio de parametro', 'Quien ejecuta el cambio'],
      ['Backtest Registry', 'Inmediato tras cada backtest', 'Quien ejecuta el backtest'],
    ],
    pipeline: [
      'Identificar cambio que requiere actualizacion documental (parametro, proceso, incidente).',
      'Actualizar el documento afectado el mismo dia del cambio; nunca diferir.',
      'Verificar que Decision Log (G16) tiene la entrada correspondiente si es cambio estructural.',
      'Si afecta al runbook diario: hacer un dry-run del runbook actualizado para verificar coherencia.',
      'En revision mensual: confirmar que Parametros Actuales coincide con el sistema real.',
      'En revision trimestral: simulacro de Runbook Emergencia para detectar pasos desactualizados.',
      'Antes de cualquier handoff: completar Handoff Checklist al 100% sin excepciones.',
    ],
    errors: [
      'Documentar el "que" de cada paso pero no el "por que" — el contexto es lo que se pierde con el tiempo.',
      'Asumir que el proximo operador tiene el mismo contexto implícito que el actual.',
      'No actualizar el runbook cuando se cambia un proceso — la documentacion desactualizada es peor que no tenerla.',
      'Tener documentacion dispersa en varios lugares sin un master claro y versionado.',
      'Confundir "esta documentado en el codigo de la app" con "esta en un runbook operativo".',
      'Hacer el handoff checklist de memoria en lugar de ejecutarlo punto por punto con el receptor.',
    ],
  },
}

// ── Module-specific content sections ────────────────────────────────────────

function MacroNowcastingContent({ mod }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Fuentes de datos por bloque" icon={BarChart3}>
          <DataTable
            headers={['Indicador', 'Frecuencia', 'Fuente', 'Lag']}
            rows={mod.dataSources}
          />
        </Section>
        <Section title="Construccion del Nowcast Score" icon={TrendingUp}>
          <div className="p-3">
            <BulletList items={mod.scoreRules} />
          </div>
        </Section>
      </div>
    </>
  )
}

function BehavioralFinanceContent({ mod }) {
  return (
    <>
      <Section title="Inventario de sesgos" icon={Brain}>
        <DataTable
          headers={['Sesgo', 'Descripcion', 'Señal de alerta']}
          rows={mod.biases}
        />
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Pre-trade checklist" icon={ListChecks}>
          <div className="p-3">
            <BulletList items={mod.preTradeChecklist} />
          </div>
        </Section>
        <Section title="Post-trade ritual" icon={CheckCircle2}>
          <div className="p-3">
            <BulletList items={mod.postTradeRitual} />
          </div>
        </Section>
      </div>

      <Section title="Cooldown triggers" icon={ShieldAlert} className="mt-4">
        <DataTable
          headers={['Condicion', 'Accion', 'Duracion']}
          rows={mod.cooldowns}
        />
      </Section>

      <Section title="Metricas de disciplina" icon={SlidersHorizontal} className="mt-4">
        <DataTable
          headers={['Metrica', 'Objetivo', 'Nivel de alerta']}
          rows={mod.metrics}
        />
      </Section>
    </>
  )
}

function DecisionLogContent({ mod }) {
  return (
    <>
      <Section title="Categorias de decision" icon={ClipboardList}>
        <DataTable
          headers={['Categoria', 'Ejemplos', 'Prioridad']}
          rows={mod.categories}
        />
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Section title="Template: campos obligatorios" icon={FileText}>
          <div className="p-3">
            <BulletList items={mod.templateFields} />
          </div>
        </Section>
        <Section title="Cadencia de revision" icon={Calendar}>
          <div className="grid gap-0">
            {mod.reviewCadence.map(([freq, action, moment]) => (
              <div key={freq} className="border-b border-[#222] p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{freq}</span>
                  <span className="font-mono text-[10px] text-[#555]">{moment}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#aaa]">{action}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

function KnowledgeTransferContent({ mod }) {
  return (
    <>
      <Section title="Inventario documental" icon={FileText}>
        <DataTable
          headers={['Documento', 'Descripcion', 'Actualizar cuando']}
          rows={mod.documents}
        />
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Estructura de runbook" icon={ListChecks}>
          <div className="p-3">
            <BulletList items={mod.runbookStructure} />
          </div>
        </Section>
        <Section title="Protocolo de onboarding" icon={Users}>
          <div className="grid gap-0">
            {mod.onboarding.map(([phase, desc]) => (
              <div key={phase} className="border-b border-[#222] p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{phase}</div>
                <p className="text-xs leading-relaxed text-[#aaa]">{desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Section title="Handoff checklist" icon={CheckCircle2}>
          <div className="grid gap-0 sm:grid-cols-2">
            {mod.handoffChecklist.map((item) => (
              <div key={item} className="flex gap-2 border-b border-r border-[#222] p-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-[#444]">[ ]</span>
                <span className="text-xs leading-relaxed text-[#aaa]">{item}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Cadencia de mantenimiento" icon={Clock}>
          <DataTable
            headers={['Documento', 'Frecuencia', 'Responsable']}
            rows={mod.maintenance}
          />
        </Section>
      </div>
    </>
  )
}

// ── Main page component ──────────────────────────────────────────────────────

const CONTENT_COMPONENTS = {
  macroNowcasting: MacroNowcastingContent,
  behavioralFinance: BehavioralFinanceContent,
  decisionLog: DecisionLogContent,
  knowledgeTransfer: KnowledgeTransferContent,
}

function GovernanceModulePage({ moduleKey }) {
  const mod = MODULES[moduleKey]
  const ContentComponent = CONTENT_COMPONENTS[moduleKey]

  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">{mod.title}</h1>
            <p className="mt-1 max-w-4xl text-sm text-[#888]">{mod.subtitle}</p>
          </div>
          <div className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            {mod.status} / {mod.horizon}
          </div>
        </div>

        <section className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-2 border-[#333] p-4">
            <div className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${mod.accent}`}>
              <BookOpen size={15} />
              Principio central
            </div>
            <p className="text-sm leading-relaxed text-white">{mod.principle}</p>
          </div>
          <div className="grid grid-rows-2 border-2 border-[#333]">
            <div className="border-b border-[#222] p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Input</div>
              <div className="text-xs leading-relaxed text-[#aaa]">{mod.input}</div>
            </div>
            <div className="p-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Output</div>
              <div className="text-xs leading-relaxed text-[#aaa]">{mod.output}</div>
            </div>
          </div>
        </section>

        <ContentComponent mod={mod} />

        <Section title="Pipeline operativo" icon={Route} className="mt-4">
          <Pipeline steps={mod.pipeline} accent={mod.accent} />
        </Section>

        {mod.parameters && (
          <Section title="Parametros default" icon={SlidersHorizontal} className="mt-4">
            <ParamTable rows={mod.parameters} />
          </Section>
        )}

        <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
          <div className="p-3">
            <BulletList items={mod.errors} />
          </div>
        </Section>

        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Pantalla operativa basada en la documentacion del framework. No ejecuta calculos automaticamente todavia.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Named exports ────────────────────────────────────────────────────────────

export function MacroNowcastingPage() {
  return <GovernanceModulePage moduleKey="macroNowcasting" />
}

export function BehavioralFinancePage() {
  return <GovernanceModulePage moduleKey="behavioralFinance" />
}

export function DecisionLogPage() {
  return <GovernanceModulePage moduleKey="decisionLog" />
}

export function KnowledgeTransferPage() {
  return <GovernanceModulePage moduleKey="knowledgeTransfer" />
}
