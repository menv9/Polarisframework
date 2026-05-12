import { create } from 'zustand'

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
}))
