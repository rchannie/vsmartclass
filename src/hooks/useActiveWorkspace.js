import { useEffect } from 'react'
import { useMyWorkspaces } from './useClassData'
import { useWorkspaceStore } from '../stores/workspace'

// Workspace aktif lintas halaman: ambil dari store, fallback ke workspace pertama
export function useActiveWorkspace(userId) {
  const { data: workspaces = [], isLoading } = useMyWorkspaces(userId)
  const { activeId, setActive } = useWorkspaceStore()

  const active = workspaces.find((w) => w.id === activeId) || workspaces[0] || null

  useEffect(() => {
    if (active && active.id !== activeId) setActive(active.id)
  }, [active, activeId, setActive])

  return { workspaces, active, setActive, isLoading }
}
