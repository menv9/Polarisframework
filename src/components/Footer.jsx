export default function Footer() {
  return (
    <footer className="border-t-2 border-[#333] py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-widest text-white">POLARIS</span>
            <span className="text-sm text-[#777] border-l-2 border-[#333] pl-3 uppercase tracking-wider">
              Framework de Trading FX Direccional
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-sm text-[#777] uppercase tracking-wider">
            <span>Capa 1 — FX Macro</span>
            <span className="text-[#333]">|</span>
            <span>Demo v0.1</span>
            <span className="text-[#333]">|</span>
            <span>2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}





