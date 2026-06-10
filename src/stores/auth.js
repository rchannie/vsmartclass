import { create } from 'zustand'
import * as api from '../lib/api'

export const useAuth = create((set) => ({
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
