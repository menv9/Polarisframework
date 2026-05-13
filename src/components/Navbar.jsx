import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'

export default function Navbar() {
  const scrolled = useAppStore((s) => s.scrolled)
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b-2 border-[#333] bg-black ${scrolled ? 'border-white' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-widest text-white">POLARIS</span>
          <span className="text-sm text-[#777] border-l-2 border-[#333] pl-3 uppercase tracking-wider">Framework</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {isHome ? (
            <>
              <a href="#pipeline" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Pipeline
              </a>
              <a href="#modules" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Modulos
              </a>
              <a href="#architecture" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Arquitectura
              </a>
              <Link to="/data" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Data
              </Link>
            </>
          ) : (
            <>
              <Link to="/" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Inicio
              </Link>
              <Link to="/data" className="text-sm font-medium text-[#888] hover:text-[#ecd987] uppercase tracking-wider">
                Data
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}





