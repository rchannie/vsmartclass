// Uji unit state machine sesi adaptif (Modul 3) — lib/api dimock sepenuhnya
// supaya fokus pada logika store: transisi fase, gerbang justifikasi RF-11,
// dan penurunan level saat justifikasi tidak verified.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSession, SESSION_LENGTH } from '../session'
import * as api from '../../lib/api'

vi.mock('../../lib/api')

let qCounter = 0
const freshQuestion = () => ({
  id: `q${qCounter++}`,
  type: 'mcq',
  prompt: 'Soal uji',
  options: [{ id: 'A', text: 'Opsi A' }, { id: 'B', text: 'Opsi B' }],
})

async function start(overrides = {}) {
  api.createSession.mockResolvedValue('sess-1')
  api.nextQuestion.mockImplementation(async () => freshQuestion())
  const p = useSession.getState().startSession({
    workspaceId: 'w1', userId: 'u1', topic: 'Topik', subject: 'Matematika', ...overrides,
  })
  await vi.advanceTimersByTimeAsync(1000)
  await p
}

async function confirm(option, revealed) {
  useSession.getState().choose(option)
  api.revealMcqOption.mockResolvedValueOnce(revealed)
  await useSession.getState().confirmChoice()
}

async function goNext() {
  api.recordAnswer.mockResolvedValue()
  const p = useSession.getState().next()
  await vi.advanceTimersByTimeAsync(2000)
  await p
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  qCounter = 0
  useSession.getState().reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('startSession', () => {
  it('sesi diagnostik mulai dari target C3', async () => {
    await start({ isDiagnostic: true })
    const s = useSession.getState()
    expect(s.phase).toBe('question')
    expect(s.target).toBe('C3')
    expect(s.items).toHaveLength(1)
    expect(s.sessionId).toBe('sess-1')
  })

  it('sesi lanjutan mulai dari startLevel yang diberikan', async () => {
    await start({ isDiagnostic: false, startLevel: 'C4' })
    expect(useSession.getState().target).toBe('C4')
  })
})

describe('confirmChoice — RF-11 gating berdasarkan hasil reveal', () => {
  it('opsi terungkap < C4: langsung ke fase feedback, tanpa justifikasi', async () => {
    await start()
    await confirm({ id: 'A', text: 'Opsi A' }, { bloom: 'C2', feedback: 'Bagus', indicator: 'ind' })

    const s = useSession.getState()
    expect(s.phase).toBe('feedback')
    expect(s.picked).toMatchObject({ id: 'A', bloom: 'C2', feedback: 'Bagus' })
    expect(s.justificationResult).toBeNull()
  })

  it('opsi terungkap >= C4: masuk fase justifying, belum ke feedback', async () => {
    await start()
    await confirm({ id: 'B', text: 'Opsi B' }, { bloom: 'C4', feedback: 'Analitis', indicator: 'ind' })

    const s = useSession.getState()
    expect(s.phase).toBe('justifying')
    expect(s.picked.bloom).toBe('C4')
  })

  it('reveal gagal (Edge Function error) tidak menjebak siswa — fallback netral C2', async () => {
    await start()
    useSession.getState().choose({ id: 'A', text: 'Opsi A' })
    api.revealMcqOption.mockRejectedValueOnce(new Error('network'))

    await useSession.getState().confirmChoice()

    const s = useSession.getState()
    expect(s.phase).toBe('feedback')
    expect(s.picked.bloom).toBe('C2')
  })
})

describe('submitJustification — penurunan level saat tidak verified', () => {
  it('verified=true: bloom_chosen tetap sesuai opsi yang diungkap', async () => {
    await start()
    await confirm({ id: 'B', text: 'Opsi B' }, { bloom: 'C5', feedback: '', indicator: '' })
    expect(useSession.getState().phase).toBe('justifying')

    api.evaluateJustification.mockResolvedValue({ verified: true, feedback: 'Kuat' })
    await useSession.getState().submitJustification('Karena saya menganalisis strukturnya secara menyeluruh.')
    expect(useSession.getState().phase).toBe('feedback')

    await goNext()
    expect(api.recordAnswer).toHaveBeenCalledWith('sess-1', expect.objectContaining({
      bloom_chosen: 'C5',
      justification_verified: true,
    }))
  })

  it('verified=false: bloom_chosen dicatat satu level di bawah yang diklaim opsi', async () => {
    await start()
    await confirm({ id: 'B', text: 'Opsi B' }, { bloom: 'C5', feedback: '', indicator: '' })

    api.evaluateJustification.mockResolvedValue({ verified: false, feedback: 'Kurang mendalam' })
    await useSession.getState().submitJustification('asal jawab saja')

    expect(useSession.getState().justificationResult).toEqual({ verified: false, feedback: 'Kurang mendalam' })

    await goNext()
    expect(api.recordAnswer).toHaveBeenCalledWith('sess-1', expect.objectContaining({
      bloom_chosen: 'C4', // diturunkan dari C5
      justification_verified: false,
    }))
  })

  it('evaluasi justifikasi gagal (Edge Function error): tidak menghukum siswa (verified=true)', async () => {
    await start()
    await confirm({ id: 'B', text: 'Opsi B' }, { bloom: 'C4', feedback: '', indicator: '' })

    api.evaluateJustification.mockRejectedValue(new Error('timeout'))
    await useSession.getState().submitJustification('alasan yang cukup panjang untuk lolos validasi lokal')

    expect(useSession.getState().phase).toBe('feedback')
    expect(useSession.getState().justificationResult).toEqual({ verified: true, feedback: '' })
  })
})

describe('next() — penyelesaian sesi', () => {
  it('menyelesaikan sesi tepat di jawaban ke-SESSION_LENGTH dan memanggil completeSession sekali', async () => {
    await start()
    api.completeSession.mockResolvedValue({ current_level: 3, session_count: 1 })

    for (let i = 0; i < SESSION_LENGTH; i++) {
      await confirm({ id: 'A', text: 'Opsi A' }, { bloom: 'C2', feedback: '', indicator: '' })
      await goNext()
    }

    const s = useSession.getState()
    expect(s.phase).toBe('done')
    expect(s.answers).toHaveLength(SESSION_LENGTH)
    expect(api.completeSession).toHaveBeenCalledTimes(1)
  })

  it('sebelum soal terakhir, phase kembali ke "question" dengan currentIdx bertambah', async () => {
    await start()
    await confirm({ id: 'A', text: 'Opsi A' }, { bloom: 'C2', feedback: '', indicator: '' })
    await goNext()

    const s = useSession.getState()
    expect(s.phase).toBe('question')
    expect(s.currentIdx).toBe(1)
    expect(s.items).toHaveLength(2)
  })
})

describe('reset()', () => {
  it('mengembalikan store ke state awal', async () => {
    await start()
    useSession.getState().reset()
    const s = useSession.getState()
    expect(s.phase).toBe('idle')
    expect(s.items).toEqual([])
    expect(s.sessionId).toBeNull()
  })
})
