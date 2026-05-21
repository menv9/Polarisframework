import { create } from 'zustand'

const THEME_KEY = 'polaris_theme'
const THEMES = new Set(['default', 'dark-veil'])

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (THEMES.has(stored)) return stored
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

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch { /* ignore */ }
}

export const useAppStore = create((set) => ({
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
    const next = THEMES.has(theme) ? theme : 'default'
    persistTheme(next)
    applyTheme(next)
    set({ theme: next })
  },
}))
