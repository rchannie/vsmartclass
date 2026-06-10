import { useQuery } from '@tanstack/react-query'
import * as api from '../lib/api'

// Profil Bloom milik satu siswa (semua topik dalam workspace)
export function useMyBloomProfiles(userId, workspaceId) {
  return useQuery({
    queryKey: ['bloom-profiles', 'me', userId, workspaceId],
    queryFn: () => api.getMyProfiles(userId, workspaceId),
    enabled: Boolean(userId),
  })
}

// Semua profil Bloom anggota workspace (guru)
export function useClassBloomProfiles(workspaceId) {
  return useQuery({
    queryKey: ['bloom-profiles', 'class', workspaceId],
    queryFn: () => api.getBloomProfiles(workspaceId),
    enabled: Boolean(workspaceId),
  })
}
