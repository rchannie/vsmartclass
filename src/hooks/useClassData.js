import { useQuery } from '@tanstack/react-query'
import * as api from '../lib/api'

export function useMyWorkspaces(userId) {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: () => api.getMyWorkspaces(userId),
    enabled: Boolean(userId),
  })
}

export function useWorkspace(id) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: () => api.getWorkspace(id),
    enabled: Boolean(id),
  })
}

export function useMembers(workspaceId) {
  return useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => api.getMembers(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useClassStats(workspaceId) {
  return useQuery({
    queryKey: ['class-stats', workspaceId],
    queryFn: () => api.getClassStats(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useQuestions(workspaceId, opts = {}) {
  return useQuery({
    queryKey: ['questions', workspaceId, opts],
    queryFn: () => api.getQuestions({ workspaceId, ...opts }),
    enabled: Boolean(workspaceId),
  })
}

export function useSessions(workspaceId, userId) {
  return useQuery({
    queryKey: ['sessions', workspaceId, userId],
    queryFn: () => api.getSessions({ workspaceId, userId }),
    enabled: Boolean(workspaceId),
  })
}
