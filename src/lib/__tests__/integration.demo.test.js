// Integration test (mode demo): guru generate & publish soal -> siswa
// menjawab PG -> profil Bloom & statistik kelas ter-update. Memverifikasi
// lib/api.js + lib/demo.js bekerja sama sebagai satu alur utuh, tanpa
// pernah menyentuh Gemini/Supabase sungguhan (mode demo = "mock Gemini").
//
// isSupabaseConfigured DIPAKSA false lewat mock — proyek ini punya .env
// dengan kredensial Supabase asli untuk dev manual, dan test TIDAK BOLEH
// pernah diam-diam menyentuh backend nyata.
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../supabase', () => ({ isSupabaseConfigured: false, supabase: null }))

const api = await import('../api')

const WORKSPACE_ID = 'w-integration-test'
const USER_ID = 'u-integration-test'
const TOPIC = 'Topik Uji Integrasi'

beforeEach(() => {
  localStorage.clear()
})

describe('Integration — alur PG: generate → jawab → profil → statistik', () => {
  it('opsi yang diterima siswa tersanitasi, reveal membuka label hanya untuk opsi dipilih', async () => {
    const [question] = await api.generateQuestions({
      subject: 'Matematika', topic: TOPIC, type: 'mcq', count: 1, maxBloom: 'C4',
      workspaceId: WORKSPACE_ID, createdBy: 'guru-1',
    })
    await api.updateQuestion(question.id, { published: true })

    const served = await api.nextQuestion({
      workspaceId: WORKSPACE_ID, topic: TOPIC, subject: 'Matematika', target: 'C2', excludeIds: [],
    })

    // Regresi keamanan Fase 2 (AUDIT.md §2.2): opsi yang diterima klien SEBELUM
    // menjawab tidak boleh membawa label Bloom/indikator/feedback.
    expect(served.type).toBe('mcq')
    for (const opt of served.options) {
      expect(opt).not.toHaveProperty('bloom')
      expect(opt).not.toHaveProperty('feedback')
      expect(opt).not.toHaveProperty('indicator')
      expect(Object.keys(opt).sort()).toEqual(['id', 'text'])
    }

    const chosen = served.options[0]
    const revealed = await api.revealMcqOption({ questionId: served.id, optionId: chosen.id })
    expect(revealed.bloom).toMatch(/^C[1-6]$/)
    expect(typeof revealed.feedback).toBe('string')
  })

  it('alur penuh: jawab → completeSession → bloom_profiles & class stats ter-update', async () => {
    const [question] = await api.generateQuestions({
      subject: 'Matematika', topic: TOPIC, type: 'mcq', count: 1, maxBloom: 'C4',
      workspaceId: WORKSPACE_ID, createdBy: 'guru-1',
    })
    await api.updateQuestion(question.id, { published: true })

    const sessionId = await api.createSession({
      workspaceId: WORKSPACE_ID, userId: USER_ID, topic: TOPIC, subject: 'Matematika',
    })

    const served = await api.nextQuestion({
      workspaceId: WORKSPACE_ID, topic: TOPIC, subject: 'Matematika', target: 'C3', excludeIds: [],
    })
    const chosen = served.options[served.options.length - 1] // opsi bernalar tertinggi di jendela ini
    const revealed = await api.revealMcqOption({ questionId: served.id, optionId: chosen.id })

    const answer = {
      question_id: served.id, chosen_option: chosen.id,
      bloom_chosen: revealed.bloom, bloom_target: 'C3',
    }
    await api.recordAnswer(sessionId, answer)

    const profile = await api.completeSession({
      sessionId, workspaceId: WORKSPACE_ID, userId: USER_ID, topic: TOPIC, answers: [answer],
    })
    expect(profile.session_count).toBe(1)
    expect(profile.topic).toBe(TOPIC)

    // Dashboard guru: profil kelas & statistik harus mencerminkan sesi barusan.
    const profiles = await api.getBloomProfiles(WORKSPACE_ID)
    const mine = profiles.find((p) => p.user_id === USER_ID && p.topic === TOPIC)
    expect(mine).toBeDefined()
    expect(mine.session_count).toBe(1)

    const stats = await api.getClassStats(WORKSPACE_ID)
    expect(stats.aiThisWeek).toBeGreaterThanOrEqual(1) // soal baru saja digenerate minggu ini
  })

  it('guru (getQuestions) tetap melihat kunci jawaban lengkap — asimetri akses yang disengaja', async () => {
    const [question] = await api.generateQuestions({
      subject: 'Matematika', topic: TOPIC, type: 'mcq', count: 1, maxBloom: 'C4',
      workspaceId: WORKSPACE_ID, createdBy: 'guru-1',
    })
    await api.updateQuestion(question.id, { published: true })

    const guruView = await api.getQuestions({ workspaceId: WORKSPACE_ID, topic: TOPIC, publishedOnly: true })
    expect(guruView[0].options.every((o) => 'bloom' in o)).toBe(true)
  })
})

describe('Integration — alur Esai: evaluasi → catat jawaban', () => {
  it('evaluateEssay (demo) mengembalikan level Bloom berdasar panjang jawaban, tercatat via recordAnswer', async () => {
    const sessionId = await api.createSession({
      workspaceId: WORKSPACE_ID, userId: USER_ID, topic: TOPIC, subject: 'Matematika',
    })
    const jawabanPanjang = 'Konsep ini dapat dianalisis dari beberapa sudut pandang, '.repeat(10)

    const result = await api.evaluateEssay({
      answer: jawabanPanjang,
      rubric: [{ bloom: 'C4', desc: 'Menganalisis hubungan antar konsep' }],
      topic: TOPIC, subject: 'Matematika', targetBloom: 'C4',
    })
    expect(result.bloom_level_achieved).toMatch(/^C[1-6]$/)

    await api.recordAnswer(sessionId, {
      question_id: 'essay-1', chosen_option: 'essay',
      bloom_chosen: result.bloom_level_achieved, bloom_target: 'C4',
    })

    const profile = await api.completeSession({
      sessionId, workspaceId: WORKSPACE_ID, userId: USER_ID, topic: TOPIC,
      answers: [{ bloom_chosen: result.bloom_level_achieved, bloom_target: 'C4' }],
    })
    expect(profile.session_count).toBe(1)
  })
})
