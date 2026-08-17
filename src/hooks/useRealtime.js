import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Update live untuk heatmap & stat cards guru (UX rule #8).
// Produksi: Supabase Realtime channel. Demo: CustomEvent dari api.completeSession.
export function useRealtimeBloom(workspaceId) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!workspaceId) return

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['bloom-profiles'] })
      qc.invalidateQueries({ queryKey: ['class-stats'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['public-questions'] })
    }

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('bloom-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bloom_profiles', filter: `workspace_id=eq.${workspaceId}` },
          invalidate,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions', filter: `workspace_id=eq.${workspaceId}` },
          invalidate,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'questions', filter: `workspace_id=eq.${workspaceId}` },
          invalidate,
        )
        .subscribe()
      return () => supabase.removeChannel(channel)
    }

    const handler = (e) => {
      if (!e.detail || e.detail.workspaceId === workspaceId) invalidate()
    }
    const storageHandler = () => invalidate()

    window.addEventListener('vsc:bloom-updated', handler)
    window.addEventListener('vsc:questions-updated', handler)
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('vsc:bloom-updated', handler)
      window.removeEventListener('vsc:questions-updated', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [workspaceId, qc])
}
