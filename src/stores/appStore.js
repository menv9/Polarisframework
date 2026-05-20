import { create } from 'zustand'

const THEME_KEY = 'polaris_theme'

const VALID_THEMES = ['default', 'mainframe', 'terminal']

function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (VALID_THEMES.includes(t)) return t
  } catch { /* ignore */ }
  return 'default'
}

function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

const initialTheme = loadTheme()
applyTheme(initialTheme)

export const useAppStore = create((set, get) => ({
  activeModule: null,
  setActiveModule: (id) => set({ activeModule: id }),
  clearActiveModule: () => set({ activeModule: null }),

  scrolled: false,
  setScrolled: (val) => set({ scrolled: val }),

  user: null,
  session: null,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  theme: initialTheme,
  setTheme: (theme) => {
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'mainframe' ? 'default' : 'mainframe'
    try { localStorage.setItem(THEME_KEY, next) } catch { /* ignore */ }
    applyTheme(next)
    set({ theme: next })
  },
}))
