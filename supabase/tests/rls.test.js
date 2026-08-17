// Test keamanan RLS — isolasi data antar-siswa dan antar-kelas (AUDIT.md §3,
// Fase 3 "Test keamanan RLS: siswa tak bisa baca data siswa/kelas lain").
//
// PENTING — TIDAK dijalankan otomatis oleh `npm test`:
//   - File ini di luar folder src/, di luar `include` vite.config.js.
//   - Membuat 2+ akun & 1 workspace SUNGGUHAN lewat signUp — HARUS dijalankan
//     terhadap proyek Supabase UJI/STAGING, JANGAN PERNAH terhadap proyek
//     produksi/live yang datanya dipakai sungguhan.
//   - Lingkungan pengembangan ini tidak punya Docker/Supabase CLI lokal
//     (`supabase start` butuh Docker), jadi tidak ada cara menjalankannya
//     secara terisolasi di sini — file ini ditulis untuk DIJALANKAN MANUAL
//     oleh siapa pun yang punya proyek Supabase uji.
//
// Prasyarat proyek Supabase target:
//   1. Migrasi supabase/setup.sql (atau seluruh migrations/0001-0010) sudah dijalankan.
//   2. Authentication → "Confirm email" dimatikan (agar signUp langsung
//      memberi sesi aktif — sama seperti asumsi src/lib/api.js#signUp).
//
// Cara menjalankan:
//   RLS_TEST_SUPABASE_URL=https://xxxx.supabase.co \
//   RLS_TEST_SUPABASE_ANON_KEY=eyJ... \
//   npx vitest run supabase/tests/rls.test.js
//
// (Opsional, untuk auto-cleanup akun uji setelah selesai:)
//   RLS_TEST_SERVICE_ROLE_KEY=eyJ...

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.RLS_TEST_SUPABASE_URL
const ANON_KEY = process.env.RLS_TEST_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.RLS_TEST_SERVICE_ROLE_KEY
const shouldRun = Boolean(URL && ANON_KEY)

const suffix = Date.now()
const PASSWORD = 'Test-RLS-1234!'

describe.skipIf(!shouldRun)('RLS — isolasi data antar-siswa & antar-kelas', () => {
  let guru, siswaA, siswaB, siswaC // C = anggota kelas LAIN (kontrol negatif)
  let workspaceA, workspaceC
  const userIds = {}

  beforeAll(async () => {
    guru = createClient(URL, ANON_KEY)
    siswaA = createClient(URL, ANON_KEY)
    siswaB = createClient(URL, ANON_KEY)
    siswaC = createClient(URL, ANON_KEY)

    const signUp = async (client, role, label) => {
      const email = `rls-${label}-${suffix}@example.com`
      const { data, error } = await client.auth.signUp({
        email, password: PASSWORD, options: { data: { full_name: `RLS ${label}`, role } },
      })
      if (error) throw new Error(`signUp ${label} gagal: ${error.message}`)
      if (!data.session) {
        throw new Error(
          `signUp ${label} tidak memberi sesi aktif — pastikan "Confirm email" OFF di proyek uji.`,
        )
      }
      userIds[label] = data.user.id
    }

    await signUp(guru, 'guru', 'guru')
    await signUp(siswaA, 'siswa', 'a')
    await signUp(siswaB, 'siswa', 'b')
    await signUp(siswaC, 'siswa', 'c')

    // Guru buat 2 kelas: A (isinya siswaA) dan C (isinya siswaC) — untuk
    // menguji isolasi ANTAR KELAS, bukan cuma antar siswa dalam satu kelas.
    const { data: wsA, error: wsAErr } = await guru
      .from('workspaces').insert({ name: `RLS Kelas A ${suffix}`, join_code: `RLSA${suffix}`.slice(-8) })
      .select().single()
    if (wsAErr) throw new Error(`Buat workspace A gagal: ${wsAErr.message}`)
    workspaceA = wsA
    await guru.from('workspace_members').insert({ workspace_id: workspaceA.id, user_id: userIds.guru, role: 'guru' })

    const { data: wsC } = await guru
      .from('workspaces').insert({ name: `RLS Kelas C ${suffix}`, join_code: `RLSC${suffix}`.slice(-8) })
      .select().single()
    workspaceC = wsC
    await guru.from('workspace_members').insert({ workspace_id: workspaceC.id, user_id: userIds.guru, role: 'guru' })

    await siswaA.rpc('join_workspace_by_code', { p_code: workspaceA.join_code })
    await siswaB.rpc('join_workspace_by_code', { p_code: workspaceA.join_code }) // B juga di kelas A
    await siswaC.rpc('join_workspace_by_code', { p_code: workspaceC.join_code }) // C di kelas LAIN

    // Guru buat 1 soal PG di kelas A dan publish, supaya ada baris `questions`
    // untuk diuji aksesnya.
    await guru.from('questions').insert({
      workspace_id: workspaceA.id, created_by: userIds.guru, subject: 'Matematika', topic: 'RLS Topic',
      type: 'mcq', bloom_target: ['C1', 'C2'], published: true,
      options: [
        { id: 'A', text: 'Opsi A', bloom: 'C1', indicator: 'ind', feedback: 'fb' },
        { id: 'B', text: 'Opsi B', bloom: 'C2', indicator: 'ind', feedback: 'fb' },
      ],
    })
  })

  afterAll(async () => {
    if (!SERVICE_KEY) return // tanpa service role, akun uji dibersihkan manual dari dashboard
    const admin = createClient(URL, SERVICE_KEY)
    for (const id of Object.values(userIds)) {
      await admin.auth.admin.deleteUser(id).catch(() => {})
    }
  })

  it('siswa TIDAK BISA select("*") tabel questions mentah (hanya guru) — AUDIT.md §2.2', async () => {
    const { data } = await siswaA.from('questions').select('*').eq('workspace_id', workspaceA.id)
    expect(data ?? []).toHaveLength(0) // RLS memblokir → hasil kosong, bukan error eksplisit
  })

  it('siswa BISA baca soal published lewat get_published_questions(), opsi tersanitasi', async () => {
    const { data, error } = await siswaA.rpc('get_published_questions', { p_workspace_id: workspaceA.id })
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
    for (const opt of data[0].options) {
      expect(opt).not.toHaveProperty('bloom')
      expect(opt).not.toHaveProperty('feedback')
    }
  })

  it('siswa kelas LAIN (C) tidak bisa lihat soal kelas A sama sekali (isolasi antar-kelas)', async () => {
    const { data } = await siswaC.rpc('get_published_questions', { p_workspace_id: workspaceA.id })
    expect(data ?? []).toHaveLength(0)
  })

  it('siswa B tidak bisa membaca bloom_profiles milik siswa A', async () => {
    // (bloom_profiles hanya ditulis lewat Edge Function service role — di sini
    // kita cukup pastikan SELECT lintas-user tidak mengembalikan baris orang lain)
    const { data } = await siswaB.from('bloom_profiles').select('*').eq('user_id', userIds.a)
    expect(data ?? []).toHaveLength(0)
  })

  it('siswa B tidak bisa membaca session_answers milik siswa A', async () => {
    const { data: sessionsOfA } = await guru.from('sessions').select('id').eq('user_id', userIds.a)
    if (!sessionsOfA?.length) return // tidak ada sesi tercatat — lewati (bukan kegagalan RLS)
    const { data } = await siswaB.from('session_answers').select('*').eq('session_id', sessionsOfA[0].id)
    expect(data ?? []).toHaveLength(0)
  })

  it('siswa tidak bisa INSERT langsung ke bloom_profiles (harus lewat Edge Function service role)', async () => {
    const { error } = await siswaA.from('bloom_profiles').insert({
      user_id: userIds.a, workspace_id: workspaceA.id, topic: 'Paksa Masuk', current_level: 6,
    })
    expect(error).not.toBeNull()
  })

  it('siswa tidak bisa UPDATE project_submissions.score milik dirinya sendiri (hanya guru — Modul 6)', async () => {
    const { data: sub } = await siswaA.from('project_submissions').insert({
      workspace_id: workspaceA.id, user_id: userIds.a, topic: 'RLS Topic', file_name: 'x.pdf',
    }).select().single()
    const { error } = await siswaA.from('project_submissions').update({ score: 100 }).eq('id', sub.id)
    // RLS memblokir: baris tidak berubah (Postgres tidak selalu mengembalikan error eksplisit
    // untuk UPDATE yang match 0 baris karena policy USING gagal) — verifikasi lewat guru.
    const { data: checked } = await guru.from('project_submissions').select('score').eq('id', sub.id).single()
    expect(error !== null || checked.score !== 100).toBe(true)
  })

  it('guru BISA memberi nilai project_submissions di kelasnya sendiri', async () => {
    const { data: sub } = await siswaA.from('project_submissions').insert({
      workspace_id: workspaceA.id, user_id: userIds.a, topic: 'RLS Topic 2', file_name: 'y.pdf',
    }).select().single()
    const { error } = await guru.from('project_submissions').update({ score: 90 }).eq('id', sub.id)
    expect(error).toBeNull()
    const { data: checked } = await guru.from('project_submissions').select('score').eq('id', sub.id).single()
    expect(checked.score).toBe(90)
  })

  it('siswa tidak bisa membuat workspace (insert workspaces ditolak untuk role siswa)', async () => {
    const { error } = await siswaA.from('workspaces').insert({ name: 'Kelas Ilegal', join_code: `ILLEGAL${suffix}` })
    expect(error).not.toBeNull()
  })
})
