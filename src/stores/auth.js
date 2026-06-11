import { create } from 'zustand'
import * as api from '../lib/api'

let authListenerActive = false

export const useAuth = create((set, get) => ({
  user: null,
  profile: null,
  status: 'loading', // 'loading' | 'ready'

  init: async () => {
    try {
      const { user, profile } = await api.restoreSession()
      set({ user, profile, status: 'ready' })
    } catch {
      set({ user: null, profile: null, status: 'ready' })
    }
    if (authListenerActive) return
    authListenerActive = true
    // Sinkronkan store dengan sesi Supabase: token kedaluwarsa/di-refresh,
    // atau akun BERBEDA login dari tab lain (sesi hanya satu per browser —
    // tab lama yang tetap memakai user basi akan gagal RLS).
    api.onAuthChange((event, session) => {
      if (!session) {
        set({ user: null, profile: null })
        return
      }
      if (event === 'TOKEN_REFRESHED') {
        set({ user: session.user })
        return
      }
      if (session.user.id !== get().user?.id) {
        // setTimeout: panggilan Supabase langsung di dalam callback
        // onAuthStateChange berisiko deadlock (navigator lock)
        setTimeout(async () => {
          try {
            const { user, profile } = await api.restoreSession()
            set({ user, profile })
          } catch {
            set({ user: null, profile: null })
          }
        }, 0)
      }
    })
  },

  signIn: async (email, password) => {
    const { user, profile } = await api.signIn(email, password)
    set({ user, profile })
    return profile
  },

  signUp: async (payload) => {
    const { user, profile } = await api.signUp(payload)
    set({ user, profile })
    return profile
  },

  signOut: async () => {
    await api.signOut()
    set({ user: null, profile: null })
  },
}))
