import { useAppStore } from '../stores/appStore'
import { useEffect } from 'react'

export default function HeroSection() {
  const setScrolled = useAppStore((s) => s.setScrolled)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [setScrolled])

  return (
    <section className="relative min-h-screen flex items-center pt-12 border-b-2 border-[#333]">
      <div className="relative z-10 px-4 text-left w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-2 border-[#333]">
          {/* Left: Title & desc */}
          <div className="lg:col-span-2 p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#333]">
            <div className="text-sm text-[#777] uppercase tracking-widest mb-4">
              Capa 1 — FX Macro
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-4 text-white">
              POLARIS
            </h1>
            <div className="text-2xl md:text-3xl font-bold tracking-tighter text-[#ecd987] mb-6">
              FRAMEWORK
            </div>
            <p className="text-sm text-[#888] max-w-md leading-relaxed">
              Sistema de trading direccional FX de capa macro.
              Siete modulos interconectados desde la vision global hasta la ejecucion.
            </p>
          </div>

          {/* Right: Stats ticker */}
          <div className="p-6 flex flex-col justify-between">
            <div className="text-sm text-[#777] uppercase tracking-widest mb-4">
              Resumen del Sistema
            </div>
            <div className="space-y-4">
              {[
                { value: '7', label: 'MODULOS' },
                { value: 'G10', label: 'DIVISAS' },
                { value: '6', label: 'CAPAS' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline justify-between border-b border-[#333] pb-2">
                  <span className="text-sm text-[#777] uppercase tracking-wider">{stat.label}</span>
                  <span className="text-3xl font-bold text-white">{stat.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t-2 border-[#333]">
              <div className="text-sm text-[#777] uppercase tracking-widest">Estado</div>
              <div className="text-sm text-[#ecd987] font-bold mt-1">DEMO V0.1</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}





