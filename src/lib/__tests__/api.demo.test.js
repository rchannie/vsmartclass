// Uji unit lib/api.js pada mode demo (localStorage) — auth, workspace, VARK,
// proyek, dan miskonsepsi. isSupabaseConfigured dipaksa false (lihat catatan
// keamanan di integration.demo.test.js).
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../supabase', () => ({ isSupabaseConfigured: false, supabase: null }))

const api = await import('../api')

beforeEach(() => {
  localStorage.clear()
})

describe('AUTH (demo)', () => {
  it('signUp lalu signIn dengan kredensial yang sama berhasil', async () => {
    const { profile } = await api.signUp({
      fullName: 'Budi Santoso', email: 'budi@test.com', password: 'rahasia123', role: 'siswa',
    })
    expect(profile.role).toBe('siswa')

    const signedIn = await api.signIn('budi@test.com', 'rahasia123')
    expect(signedIn.user.email).toBe('budi@test.com')
  })

  it('signUp menolak email yang sudah terdaftar', async () => {
    await api.signUp({ fullName: 'A', email: 'dup@test.com', password: 'x12345', role: 'siswa' })
    await expect(
      api.signUp({ fullName: 'B', email: 'dup@test.com', password: 'y12345', role: 'siswa' }),
    ).rejects.toThrow('Email sudah terdaftar.')
  })

  it('signIn menolak kata sandi salah', async () => {
    await api.signUp({ fullName: 'A', email: 'salah@test.com', password: 'benar123', role: 'siswa' })
    await expect(api.signIn('salah@test.com', 'salah-banget')).rejects.toThrow('Email atau kata sandi salah.')
  })

  it('restoreSession mengembalikan user setelah signIn, null setelah signOut', async () => {
    await api.signUp({ fullName: 'A', email: 'sesi@test.com', password: 'benar123', role: 'guru' })
    let restored = await api.restoreSession()
    expect(restored.user).not.toBeNull()

    await api.signOut()
    restored = await api.restoreSession()
    expect(restored.user).toBeNull()
  })
})

describe('WORKSPACE (demo)', () => {
  it('guru membuat workspace, siswa bisa join lewat kode', async () => {
    const guru = await api.signUp({ fullName: 'Guru A', email: 'guru-a@test.com', password: 'x12345', role: 'guru' })
    const ws = await api.createWorkspace({ name: 'X IPA 1', school: 'SMA Uji', subject: 'Biologi' }, guru.user)
    expect(ws.join_code).toMatch(/^VSC-[A-Z0-9]{4}$/)

    const siswa = await api.signUp({ fullName: 'Siswa A', email: 'siswa-a@test.com', password: 'x12345', role: 'siswa' })
    const joined = await api.joinWorkspace(ws.join_code, siswa.user)
    expect(joined.id).toBe(ws.id)

    const members = await api.getMembers(ws.id)
    expect(members.map((m) => m.role).sort()).toEqual(['guru', 'siswa'])
  })

  it('join dengan kode yang tidak ada ditolak dengan pesan jelas', async () => {
    const siswa = await api.signUp({ fullName: 'Siswa B', email: 'siswa-b@test.com', password: 'x12345', role: 'siswa' })
    await expect(api.joinWorkspace('VSC-ZZZZ', siswa.user)).rejects.toThrow('Kode tidak ditemukan')
  })

  it('removeMember menghapus keanggotaan workspace', async () => {
    const guru = await api.signUp({ fullName: 'Guru B', email: 'guru-b@test.com', password: 'x12345', role: 'guru' })
    const ws = await api.createWorkspace({ name: 'Kelas B' }, guru.user)
    const siswa = await api.signUp({ fullName: 'Siswa C', email: 'siswa-c@test.com', password: 'x12345', role: 'siswa' })
    await api.joinWorkspace(ws.join_code, siswa.user)

    await api.removeMember(ws.id, siswa.user.id)
    const members = await api.getMembers(ws.id)
    expect(members.find((m) => m.user_id === siswa.user.id)).toBeUndefined()
  })
})

describe('VARK (demo)', () => {
  it('menyimpan dan membaca gaya belajar VARK', async () => {
    const { user } = await api.signUp({ fullName: 'Siswa VARK', email: 'vark@test.com', password: 'x12345', role: 'siswa' })
    expect(await api.getVarkStyle(user.id)).toBeNull()

    await api.saveVarkStyle(user.id, 'V')
    expect(await api.getVarkStyle(user.id)).toBe('V')
  })
})

describe('PROYEK (demo — Modul 6)', () => {
  it('siswa submit proyek, guru memberi nilai', async () => {
    const guru = await api.signUp({ fullName: 'Guru C', email: 'guru-c@test.com', password: 'x12345', role: 'guru' })
    const ws = await api.createWorkspace({ name: 'Kelas C' }, guru.user)
    const siswa = await api.signUp({ fullName: 'Siswa D', email: 'siswa-d@test.com', password: 'x12345', role: 'siswa' })
    await api.joinWorkspace(ws.join_code, siswa.user)

    const submission = await api.submitProject({
      workspaceId: ws.id, userId: siswa.user.id, topic: 'Proyek Uji',
      fileName: 'laporan.pdf', fileSize: 1024, filePath: null, description: 'Ringkasan',
    })
    expect(submission.reviewed_at).toBeUndefined()

    const reviewed = await api.reviewProjectSubmission(submission.id, { score: 88, teacherFeedback: 'Kerja bagus' })
    expect(reviewed.score).toBe(88)
    expect(reviewed.reviewed_at).toBeTruthy()

    const list = await api.getProjectSubmissions(ws.id)
    expect(list[0].score).toBe(88)
  })
})

describe('MISKONSEPSI (demo — Modul 5)', () => {
  it('mengagregasi session_answers di bawah target per topik', async () => {
    const guru = await api.signUp({ fullName: 'Guru D', email: 'guru-d@test.com', password: 'x12345', role: 'guru' })
    const ws = await api.createWorkspace({ name: 'Kelas D' }, guru.user)
    const siswa = await api.signUp({ fullName: 'Siswa E', email: 'siswa-e@test.com', password: 'x12345', role: 'siswa' })
    await api.joinWorkspace(ws.join_code, siswa.user)

    const sessionId = await api.createSession({
      workspaceId: ws.id, userId: siswa.user.id, topic: 'Topik Sulit', subject: 'Fisika',
    })
    await api.recordAnswer(sessionId, { question_id: 'q1', chosen_option: 'A', bloom_chosen: 'C1', bloom_target: 'C4' })
    await api.recordAnswer(sessionId, { question_id: 'q2', chosen_option: 'B', bloom_chosen: 'C4', bloom_target: 'C4' })

    const misconceptions = await api.getMisconceptions(ws.id)
    const topikSulit = misconceptions.find((m) => m.topic === 'Topik Sulit')
    expect(topikSulit).toBeDefined()
    expect(topikSulit.misses).toBe(1)
    expect(topikSulit.total).toBe(2)
  })
})
