import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const theorySections = [
  { id: 'pipeline', label: 'ESTRUCTURA DEL MODULO' },
  { id: 'docs', label: 'DOCUMENTACION' },
  { id: 'cheatsheet', label: 'CHEATSHEET OPERATIVO' },
  { id: 'sources', label: 'FUENTES' },
]

const opsSections = [
  // Operativa is a single-page dashboard; no scroll sections needed
]

export default function WorldViewSidebar({ mode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sections = mode === 'theory' ? theorySections : opsSections

  const handleClick = (id) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#B8A060] text-black flex items-center justify-center border-2 border-white font-bold text-sm"
      >
        {mobileOpen ? 'X' : 'MENU'}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/90 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-12 lg:top-0 left-0 h-[calc(100vh-48px)] lg:h-[calc(100vh-48px)] w-64 bg-black border-r-2 border-[#333] overflow-y-auto z-40 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#555] hover:text-[#B8A060] mb-4 uppercase tracking-wider"
          >
            {'<-'} Volver a Polaris
          </Link>

          <div className="mb-4 pb-4 border-b-2 border-[#333]">
            <span className="text-sm font-bold tracking-widest uppercase text-[#B8A060] mb-1 block">
              PARTE I
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider">WORLD VIEW</h2>
            <p className="text-sm text-[#555] mt-1 uppercase tracking-wider">Regimen macro global</p>
          </div>

          {/* Mode tabs */}
          <div className="flex border-2 border-[#333] mb-3">
            <Link
              to="/world-view"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold uppercase tracking-wider ${
                mode === 'theory'
                  ? 'bg-[#111] text-[#B8A060]'
                  : 'text-[#555] hover:text-white'
              }`}
            >
              TEORIA
            </Link>
            <Link
              to="/world-view/operativa"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-bold uppercase tracking-wider ${
                mode === 'ops'
                  ? 'bg-[#111] text-[#B8A060]'
                  : 'text-[#555] hover:text-white'
              }`}
            >
              OPERATIVA
            </Link>
          </div>

          <nav className="space-y-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleClick(section.id)}
                className="w-full text-left px-2 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#111] uppercase tracking-wider border-b border-[#222]"
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}





