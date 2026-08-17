// Uji unit hook React Query — memverifikasi queryFn benar-benar memanggil
// fungsi lib/api yang sesuai dan hook dinonaktifkan saat id tak tersedia
// (mencegah query liar dengan workspaceId undefined).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '../../lib/api'
import {
  useMyWorkspaces, useClassStats, useQuestions, usePublicQuestions, useMisconceptions,
} from '../useClassData'

vi.mock('../../lib/api')

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useMyWorkspaces', () => {
  it('memanggil api.getMyWorkspaces dengan userId dan mengembalikan hasilnya', async () => {
    api.getMyWorkspaces.mockResolvedValue([{ id: 'w-1', name: 'XI MIPA 2' }])
    const { result } = renderHook(() => useMyWorkspaces('u-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.getMyWorkspaces).toHaveBeenCalledWith('u-1')
    expect(result.current.data).toEqual([{ id: 'w-1', name: 'XI MIPA 2' }])
  })

  it('tidak memanggil api sama sekali bila userId kosong (enabled=false)', () => {
    renderHook(() => useMyWorkspaces(undefined), { wrapper })
    expect(api.getMyWorkspaces).not.toHaveBeenCalled()
  })
})

describe('useClassStats', () => {
  it('memanggil api.getClassStats dengan workspaceId', async () => {
    api.getClassStats.mockResolvedValue({ aiThisWeek: 3, levelUp: 40, attention: 1, avgLevel: 3.2 })
    const { result } = renderHook(() => useClassStats('w-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.getClassStats).toHaveBeenCalledWith('w-1')
    expect(result.current.data.avgLevel).toBe(3.2)
  })
})

describe('useQuestions vs usePublicQuestions — jalur guru vs siswa terpisah', () => {
  it('useQuestions (guru) memanggil api.getQuestions', async () => {
    api.getQuestions.mockResolvedValue([{ id: 'q1', options: [{ id: 'A', bloom: 'C1' }] }])
    const { result } = renderHook(() => useQuestions('w-1', { publishedOnly: true }), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.getQuestions).toHaveBeenCalledWith({ workspaceId: 'w-1', publishedOnly: true })
    expect(api.getPublicQuestions).not.toHaveBeenCalled()
  })

  it('usePublicQuestions (siswa) memanggil api.getPublicQuestions, bukan getQuestions', async () => {
    api.getPublicQuestions.mockResolvedValue([{ id: 'q1', options: [{ id: 'A', text: 'x' }] }])
    const { result } = renderHook(() => usePublicQuestions('w-1', 'Topik'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.getPublicQuestions).toHaveBeenCalledWith('w-1', 'Topik')
    expect(api.getQuestions).not.toHaveBeenCalled()
  })
})

describe('useMisconceptions', () => {
  it('memanggil api.getMisconceptions dengan workspaceId', async () => {
    api.getMisconceptions.mockResolvedValue([{ topic: 'A', misses: 2, total: 5, rate: 40 }])
    const { result } = renderHook(() => useMisconceptions('w-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(api.getMisconceptions).toHaveBeenCalledWith('w-1')
  })
})
