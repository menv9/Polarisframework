import { useState } from 'react'
import { Link } from 'react-router-dom'

// Cost reference data from Documentation/03_CAPA_1_FX_Macro/FX_Execution_Module/02_2._Costes_por_Par_G10.md
const COST_TABLE = [
  { pair: 'EUR/USD', spreadTyp: '0.3–0.5', spreadOverlap: '0.2–0.4', spreadAsia: '0.5–0.8', swapNote: 'Long: neg (Fed>ECB)', slippage: '0.2–0.8' },
  { pair: 'USD/JPY', spreadTyp: '0.4–0.6', spreadOverlap: '0.3–0.5', spreadAsia: '0.5–0.8', swapNote: 'Long: pos (Fed>BoJ)', slippage: '0.2–0.8' },
  { pair: 'GBP/USD', spreadTyp: '0.5–0.8', spreadOverlap: '0.4–0.7', spreadAsia: '0.8–1.5', swapNote: 'Varía dirección', slippage: '0.3–1.0' },
  { pair: 'USD/CHF', spreadTyp: '0.6–0.9', spreadOverlap: '0.5–0.8', spreadAsia: '0.8–1.5', swapNote: 'Varía dirección', slippage: '0.3–1.0' },
  { pair: 'AUD/USD', spreadTyp: '0.5–0.8', spreadOverlap: '0.4–0.7', spreadAsia: '0.6–1.0', swapNote: 'Long: pos (RBA>Fed)', slippage: '0.3–1.0' },
  { pair: 'USD/CAD', spreadTyp: '0.6–0.9', spreadOverlap: '0.5–0.8', spreadAsia: '0.8–1.5', swapNote: 'Varía dirección', slippage: '0.3–1.0' },
  { pair: 'NZD/USD', spreadTyp: '0.8–1.2', spreadOverlap: '0.7–1.0', spreadAsia: '1.0–1.8', swapNote: 'Varía dirección', slippage: '0.5–1.5' },
  { pair: 'USD/NOK', spreadTyp: '8–15 pts', spreadOverlap: '6–12',  spreadAsia: '15–30',  swapNote: 'Varía dirección', slippage: '2–5' },
  { pair: 'USD/SEK', spreadTyp: '8–15 pts', spreadOverlap: '6–12',  spreadAsia: '15–30',  swapNote: 'Varía dirección', slippage: '2–5' },
]

const SESSION_GUIDE = [
  { session: 'Asia (00:00–07:00 GMT)',       liquidity: 'Baja',     slippage: '1–3 pips', spreadX: '1.5×–2×',  verdict: 'EVITAR' },
  { session: 'London open (07:00–09:00 GMT)',liquidity: 'Alta/vol', slippage: '0.5–2 pips',spreadX: '1×',      verdict: 'CON CUIDADO' },
  { session: 'London (09:00–13:00 GMT)',     liquidity: 'Alta',     slippage: '0.3–1 pip', spreadX: '1×',      verdict: 'OK' },
  { session: 'London/NY (13:00–17:00 GMT)',  liquidity: 'Máxima',   slippage: '0.2–0.8 pip',spreadX: '0.8–1×', verdict: 'ÓPTIMO' },
  { session: 'NY (17:00–21:00 GMT)',         liquidity: 'Alta',     slippage: '0.3–1 pip', spreadX: '1×',      verdict: 'OK' },
  { session: 'NY late (21:00–24:00 GMT)',    liquidity: 'Decreciente',slippage: '1–3 pips',spreadX: '1.5×–2×', verdict: 'EVITAR' },
]

const ORDER_TYPES = [
  { type: 'Market Order',      when: 'Setup MoO (Market on Open), breakout confirmado, urgencia', pros: 'Ejecución garantizada', cons: 'Slippage durante eventos; spread implícito' },
  { type: 'Limit Order',       when: 'Pullback a nivel/MA previsto; entry precios específicos', pros: 'Precio garantizado; cero slippage', cons: 'Puede no ejecutar si el nivel no llega' },
  { type: 'Stop Order (Buy/Sell Stop)', when: 'Ruptura de nivel; confirmación de momentum', pros: 'Confirma breakout antes de entrar', cons: 'Falsos breakouts; slippage posible en gap' },
  { type: 'OCO (One Cancels Other)', when: 'Stop + target preestablecidos; gestión no supervisada', pros: 'Automatiza salida completa', cons: 'Requiere plataforma que lo soporte' },
]

const EXECUTION_CHECKLIST = [
  'Sesión óptima verificada (evitar Asia y eventos)',
  'Spread actual chequeado vs referencia — no más del doble del spread típico',
  'Sin evento NIVEL 1 en próximas 4 horas (no solo 48h del timing)',
  'Orden preparada antes de abrir: tipo, tamaño, stop, target',
  'Stop colocado simultáneamente con la entrada — NUNCA sin stop',
  'Tamaño máximo: el calculado en Risk Management, nunca más',
  'Confirmar pip value y notional antes de ejecutar',
  'Si ejecución manual: pantalla limpia, sin distracciones',
]

export default function ExecutionOpsPage() {
  const [selectedPair, setSelectedPair] = useState('EUR/USD')
  const [orderType,    setOrderType]    = useState('')
  const [checks,       setChecks]       = useState({})

  function toggleCheck(i) {
    setChecks(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const allOk = checkedCount === EXECUTION_CHECKLIST.length

  const pairData = COST_TABLE.find(r => r.pair === selectedPair)

  const sessionVerdictColor = (v) =>
    v === 'ÓPTIMO' ? 'text-[#4ade80]' : v === 'OK' ? 'text-[#a3a3a3]' : v === 'CON CUIDADO' ? 'text-[#f59e0b]' : 'text-[#ef4444]'

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">EXECUTION</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Módulo V — Costes · Órdenes · Blackouts</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            <Link to="/risk/operativa"  className="font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">← RISK</Link>
            <Link to="/journal"         className="font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">JOURNAL →</Link>
          </div>
        </div>

        {/* Par selector */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Costes de Transacción por Par</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {COST_TABLE.map(r => (
              <button key={r.pair} onClick={() => setSelectedPair(r.pair)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                  selectedPair === r.pair
                    ? 'border-[#ecd987] text-[#ecd987] bg-[#1a1a0d]'
                    : 'border-[#333] text-[#555] hover:text-[#a3a3a3] hover:border-[#555]'
                }`}>
                {r.pair}
              </button>
            ))}
          </div>
          {pairData && (
            <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-[#222]">
              {[
                { label: 'Spread típico', value: `${pairData.spreadTyp} pips` },
                { label: 'Spread overlap', value: `${pairData.spreadOverlap} pips` },
                { label: 'Spread Asia', value: `${pairData.spreadAsia} pips` },
                { label: 'Swap dirección', value: pairData.swapNote },
                { label: 'Slippage típico', value: `${pairData.slippage} pips` },
              ].map(item => (
                <div key={item.label} className="p-3 border-r border-b border-[#222]">
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-[#a3a3a3]">{item.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="px-3 py-2 border-t border-[#222] text-[10px] text-[#444]">
            Broker ECN/Prime. Broker market-maker añade 0.3–1.0 pip extra. Eventos macro: spread 5×–20× durante 30–300 seg — no abrir/cerrar.
          </div>
        </div>

        {/* Tabla de costes completa */}
        <div className="border-2 border-[#333] mb-3 overflow-x-auto">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Tabla Completa G10</span>
          </div>
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[18%]">Par</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[18%]">Spread típico</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[18%]">Overlap</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[18%]">Asia</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[28%]">Swap</th>
              </tr>
            </thead>
            <tbody>
              {COST_TABLE.map(r => (
                <tr key={r.pair} className={`border-b border-[#1a1a1a] ${r.pair === selectedPair ? 'bg-[#1a1a0d]' : 'hover:bg-[#0a0a0a]'}`}>
                  <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3]">{r.pair}</td>
                  <td className="px-3 py-1.5 font-mono text-[#e5e5e5]">{r.spreadTyp}</td>
                  <td className="px-3 py-1.5 font-mono text-[#4ade80]">{r.spreadOverlap}</td>
                  <td className="px-3 py-1.5 font-mono text-[#f59e0b]">{r.spreadAsia}</td>
                  <td className="px-3 py-1.5 text-[#555]">{r.swapNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sesiones */}
        <div className="border-2 border-[#333] mb-3 overflow-x-auto">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Guía de Sesiones — Liquidez y Slippage</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Sesión</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Liquidez</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Slippage</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Spread ×</th>
                <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody>
              {SESSION_GUIDE.map(s => (
                <tr key={s.session} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a]">
                  <td className="px-3 py-1.5 font-mono text-[#a3a3a3]">{s.session}</td>
                  <td className="px-3 py-1.5 text-[#555]">{s.liquidity}</td>
                  <td className="px-3 py-1.5 font-mono text-[#e5e5e5]">{s.slippage}</td>
                  <td className="px-3 py-1.5 font-mono text-[#555]">{s.spreadX}</td>
                  <td className={`px-3 py-1.5 font-bold uppercase tracking-wider ${sessionVerdictColor(s.verdict)}`}>{s.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order types */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Tipos de Orden — Cuándo Usar Cada Uno</span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {ORDER_TYPES.map(o => (
              <div
                key={o.type}
                className={`px-3 py-2.5 cursor-pointer hover:bg-[#0a0a0a] transition-colors ${orderType === o.type ? 'bg-[#1a1a0d]' : ''}`}
                onClick={() => setOrderType(orderType === o.type ? '' : o.type)}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${orderType === o.type ? 'text-[#ecd987]' : 'text-[#a3a3a3]'}`}>{o.type}</span>
                  <span className="text-[10px] text-[#333]">{orderType === o.type ? '▲' : '▼'}</span>
                </div>
                {orderType === o.type && (
                  <div className="mt-2 grid grid-cols-3 gap-3 text-[10px]">
                    <div>
                      <div className="text-[#555] uppercase tracking-wider mb-0.5">Cuándo</div>
                      <div className="text-[#e5e5e5]">{o.when}</div>
                    </div>
                    <div>
                      <div className="text-[#4ade80] uppercase tracking-wider mb-0.5">Ventajas</div>
                      <div className="text-[#e5e5e5]">{o.pros}</div>
                    </div>
                    <div>
                      <div className="text-[#ef4444] uppercase tracking-wider mb-0.5">Desventajas</div>
                      <div className="text-[#e5e5e5]">{o.cons}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pre-execution checklist */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Checklist Pre-Ejecución</span>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">{checkedCount}/{EXECUTION_CHECKLIST.length}</span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {EXECUTION_CHECKLIST.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#0a0a0a] transition-colors ${checks[i] ? 'bg-[#0a1a0a]' : ''}`}
                onClick={() => toggleCheck(i)}
              >
                <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-xs font-bold ${checks[i] ? 'border-[#4ade80] text-[#4ade80] bg-[#0d1f0d]' : 'border-[#333] text-[#333]'}`}>
                  {checks[i] ? '✓' : ''}
                </div>
                <span className={`text-xs ${checks[i] ? 'text-[#555] line-through' : 'text-[#a3a3a3]'}`}>{item}</span>
              </div>
            ))}
          </div>
          {allOk && (
            <div className="p-3 border-t border-[#4ade80] bg-[#0a1a0a] flex items-center justify-between">
              <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">✓ Ejecución autorizada</span>
              <Link to="/journal" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#4ade80] text-black hover:bg-[#22c55e] transition-colors">
                → Registrar en Journal
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
