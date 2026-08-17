// Lapisan data terpadu. Satu antarmuka untuk dua backend:
//  - Supabase (produksi) bila VITE_SUPABASE_URL & ANON_KEY terisi
//  - Mode demo (localStorage, seed LIDM) bila tidak
// Semua halaman/hook memanggil fungsi di sini — tidak ada query langsung di UI.

import { supabase, isSupabaseConfigured } from './supabase'
import { invokeEdge } from './gemini'
import {
  loadDB, saveDB, demoSession, newId,
  demoGenerateQuestions, demoAdaptiveQuestion, computeProfileUpdate,
} from './demo'
import { levelOf, summarizeMisconceptions } from './bloom'
import { buildStudentRecs } from './recs'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Hapus field bloom/indicator/feedback dari tiap opsi PG — dipakai sebelum
// data soal menyentuh state siswa (lihat AUDIT.md §2.2: label Bloom per-opsi
// sebelumnya bisa diintip lewat DevTools sebelum soal dijawab).
function sanitizeQuestion(q) {
  if (q.type !== 'mcq' || !Array.isArray(q.options)) return q
  return { ...q, options: q.options.map((o) => ({ id: o.id, text: o.text })) }
}

const makeJoinCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return 'VSC-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

// Ambil profil; bila barisnya tidak ada (akun lama / konfirmasi email),
// rekonstruksi dari metadata auth. Mengembalikan null bila tidak bisa dipulihkan.
async function fetchOrCreateProfile(user) {
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile) return profile
  const meta = user.user_metadata || {}
  if (!meta.role) return null
  const fresh = {
    id: user.id,
    full_name: meta.full_name || user.email.split('@')[0],
    role: meta.role,
  }
  const { error } = await supabase
    .from('profiles')
    .upsert(fresh, { onConflict: 'id', ignoreDuplicates: true })
  return error ? null : fresh
}

export async function restoreSession() {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) return { user: null, profile: null }
    const profile = await fetchOrCreateProfile(user)
    // Sesi tanpa profil yang bisa dipulihkan → perlakukan sebagai belum login
    if (!profile) return { user: null, profile: null }
    return { user, profile }
  }
  const sess = demoSession.get()
  if (!sess) return { user: null, profile: null }
  const db = loadDB()
  const u = db.users.find((x) => x.id === sess.userId)
  if (!u) return { user: null, profile: null }
  return {
    user: { id: u.id, email: u.email },
    profile: { id: u.id, full_name: u.full_name, role: u.role },
  }
}

export async function signIn(email, password) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Email atau kata sandi salah.')
    const profile = await fetchOrCreateProfile(data.user)
    if (!profile) {
      await supabase.auth.signOut()
      throw new Error('Data profil akun ini tidak ditemukan. Silakan daftar ulang.')
    }
    return { user: data.user, profile }
  }
  await delay(400)
  const db = loadDB()
  const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password)
  if (!u) throw new Error('Email atau kata sandi salah.')
  demoSession.set({ userId: u.id })
  return {
    user: { id: u.id, email: u.email },
    profile: { id: u.id, full_name: u.full_name, role: u.role },
  }
}

export async function signUp({ fullName, email, password, role }) {
  if (isSupabaseConfigured) {
    // Metadata ikut tersimpan di auth.users → trigger DB membuat baris profiles,
    // dan profil bisa direkonstruksi saat login bila baris sempat hilang.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw new Error(error.message)
    // If email confirmation is required, session is null — user isn't authenticated yet.
    // Proceeding would cause every authenticated RLS policy to fail with 403.
    if (!data.session) {
      throw new Error('Link konfirmasi terkirim ke email kamu. Klik link tersebut lalu masuk kembali.')
    }
    const profile = { id: data.user.id, full_name: fullName, role }
    // Trigger on_auth_user_created biasanya sudah membuat barisnya — upsert ini
    // hanya fallback bila trigger belum terpasang di database.
    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id', ignoreDuplicates: true })
    if (pErr) throw new Error(pErr.message)
    return { user: data.user, profile }
  }
  await delay(400)
  const db = loadDB()
  if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase()))
    throw new Error('Email sudah terdaftar.')
  const u = { id: newId(), email, password, full_name: fullName, role }
  db.users.push(u)
  saveDB(db)
  demoSession.set({ userId: u.id })
  return {
    user: { id: u.id, email: u.email },
    profile: { id: u.id, full_name: u.full_name, role: u.role },
  }
}

export async function signOut() {
  if (isSupabaseConfigured) await supabase.auth.signOut()
  else demoSession.clear()
}

export function onAuthChange(callback) {
  if (!isSupabaseConfigured) return null
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return subscription
}

// ---------------------------------------------------------------------------
// WORKSPACE
// ---------------------------------------------------------------------------

// ID user dari sesi aktif klien — sumber kebenaran untuk mutasi.
// State React bisa basi bila tab lain login akun berbeda (sesi Supabase
// hanya satu per browser); JWT request selalu milik sesi terakhir.
async function authUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user?.id
  if (!id) throw new Error('Sesi berakhir. Silakan masuk kembali.')
  return id
}

export async function getMyWorkspaces(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', userId)
    if (error) throw error
    return data.map((r) => r.workspaces)
  }
  const db = loadDB()
  const ids = db.members.filter((m) => m.user_id === userId).map((m) => m.workspace_id)
  return db.workspaces.filter((w) => ids.includes(w.id))
}

export async function getWorkspace(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return loadDB().workspaces.find((w) => w.id === id) || null
}

export async function createWorkspace({ name, school, subject }, user) {
  const join_code = makeJoinCode()
  if (isSupabaseConfigured) {
    const uid = await authUserId()
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, school, subject, join_code, created_by: uid })
      .select().single()
    if (error) throw error
    const { error: mErr } = await supabase
      .from('workspace_members').insert({ workspace_id: data.id, user_id: uid, role: 'guru' })
    if (mErr) throw mErr
    return data
  }
  const db = loadDB()
  const w = { id: newId(), name, school, subject, join_code, created_by: user.id, created_at: new Date().toISOString() }
  db.workspaces.push(w)
  db.members.push({ workspace_id: w.id, user_id: user.id, role: 'guru', joined_at: w.created_at })
  saveDB(db)
  return w
}

export async function findWorkspaceByCode(code) {
  const clean = code.trim().toUpperCase()
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('workspaces').select('*').eq('join_code', clean).maybeSingle()
    return data || null
  }
  return loadDB().workspaces.find((w) => w.join_code.toUpperCase() === clean) || null
}

export async function joinWorkspace(code, user, role = 'siswa') {
  if (isSupabaseConfigured) {
    // RPC security definer — user_id & role ditentukan server-side dari
    // auth.uid() + profiles.role; kebal sesi basi dan self-elevation.
    const { data, error } = await supabase.rpc('join_workspace_by_code', { p_code: code })
    if (error) throw new Error(error.message || 'Gagal bergabung ke kelas.')
    return data
  }
  const w = await findWorkspaceByCode(code)
  if (!w) throw new Error('Kode tidak ditemukan. Periksa kembali kode dari gurumu.')
  const db = loadDB()
  if (!db.members.some((m) => m.workspace_id === w.id && m.user_id === user.id)) {
    db.members.push({ workspace_id: w.id, user_id: user.id, role, joined_at: new Date().toISOString() })
    saveDB(db)
  }
  return w
}

export async function getMembers(workspaceId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, role, joined_at, profiles(id, full_name, avatar_url)')
      .eq('workspace_id', workspaceId)
    if (error) throw error
    return data.map((m) => ({
      user_id: m.user_id, role: m.role, joined_at: m.joined_at,
      full_name: m.profiles?.full_name || '—',
    }))
  }
  const db = loadDB()
  return db.members
    .filter((m) => m.workspace_id === workspaceId)
    .map((m) => {
      const u = db.users.find((x) => x.id === m.user_id)
      return { user_id: m.user_id, role: m.role, joined_at: m.joined_at, full_name: u?.full_name || '—' }
    })
}

export async function removeMember(workspaceId, userId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('workspace_members').delete()
      .eq('workspace_id', workspaceId).eq('user_id', userId)
    if (error) throw error
    return
  }
  const db = loadDB()
  db.members = db.members.filter((m) => !(m.workspace_id === workspaceId && m.user_id === userId))
  saveDB(db)
}

// ---------------------------------------------------------------------------
// QUESTIONS
// ---------------------------------------------------------------------------

export async function getQuestions({ workspaceId, topic, publishedOnly = false }) {
  if (isSupabaseConfigured) {
    let q = supabase.from('questions').select('*').eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    if (topic) q = q.eq('topic', topic)
    if (publishedOnly) q = q.eq('published', true)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  const db = loadDB()
  return db.questions
    .filter((x) => x.workspace_id === workspaceId)
    .filter((x) => (topic ? x.topic === topic : true))
    .filter((x) => (publishedOnly ? x.published : true))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

// Daftar soal published dengan opsi PG TERSANITASI (tanpa label Bloom) —
// dipakai halaman siswa yang cuma perlu tahu topik/tipe soal, bukan kunci
// jawabannya (Home, Tasks, ProjectSubmit). Untuk guru, tetap pakai getQuestions
// (perlu melihat kunci jawaban untuk meninjau/mengedit).
export async function getPublicQuestions(workspaceId, topic) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('get_published_questions', {
      p_workspace_id: workspaceId, p_topic: topic || null,
    })
    if (error) throw error
    return data
  }
  const rows = await getQuestions({ workspaceId, topic, publishedOnly: true })
  return rows.map(sanitizeQuestion)
}

export async function getQuestion(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('questions').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return loadDB().questions.find((q) => q.id === id) || null
}

export async function saveQuestions(questions) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('questions').insert(questions).select()
    if (error) throw error
    return data
  }
  const db = loadDB()
  db.questions.push(...questions)
  saveDB(db)
  return questions
}

export async function updateQuestion(id, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('questions').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const db = loadDB()
  const i = db.questions.findIndex((q) => q.id === id)
  if (i >= 0) {
    db.questions[i] = { ...db.questions[i], ...patch }
    saveDB(db)
    return db.questions[i]
  }
  return null
}

export async function deleteQuestion(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
    return
  }
  const db = loadDB()
  db.questions = db.questions.filter((q) => q.id !== id)
  saveDB(db)
}

// ---------------------------------------------------------------------------
// GENERATE (AI) — Edge Function `generate-questions`, fallback generator demo
// ---------------------------------------------------------------------------

export async function generateQuestions(params) {
  if (isSupabaseConfigured) {
    const data = await invokeEdge('generate-questions', params)
    return data.questions  // already persisted by Edge Function
  }
  // Simulasi latensi AI agar shimmer terlihat (UX rule #5)
  await delay(1800)
  const questions = demoGenerateQuestions(params)
  const db = loadDB()
  db.questions.push(...questions)
  saveDB(db)
  return questions
}

// ---------------------------------------------------------------------------
// SESI ADAPTIF   
// ---------------------------------------------------------------------------

export async function createSession({ workspaceId, userId, topic, subject }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ workspace_id: workspaceId, user_id: userId, topic, subject })
      .select().single()
    if (error) throw error
    return data.id
  }
  const db = loadDB()
  const id = newId()
  db.sessions.push({
    id, workspace_id: workspaceId, user_id: userId, topic, subject,
    bloom_level: null, item_count: 0,
    started_at: new Date().toISOString(), completed_at: null,
  })
  saveDB(db)
  return id
}

// Cache lokal (id soal -> soal lengkap belum tersanitasi) untuk soal yang
// TIDAK datang dari get-next-question (mode demo, atau fallback saat Edge
// Function produksi gagal total) — dipakai revealMcqOption di bawah, karena
// soal semacam ini tidak selalu tersimpan di tabel questions (mis. hasil
// demoAdaptiveQuestion bersifat sekali pakai, tidak dipersist).
const localAnswerKeyCache = new Map()

// Soal berikutnya untuk sesi adaptif. Produksi: satu panggilan ke Edge Function
// get-next-question yang memilih dari bank ATAU generate baru — pemilihan
// kandidat (yang perlu membaca label Bloom tiap opsi) terjadi di server,
// sehingga klien hanya menerima opsi yang SUDAH tersanitasi (AUDIT.md §2.2).
// Bila Edge Function gagal total, jatuh ke generator lokal (jalur yang sama
// dipakai mode demo) — hasilnya tetap disanitasi & di-cache untuk reveal.
export async function nextQuestion({ workspaceId, topic, subject, target, excludeIds = [] }) {
  if (isSupabaseConfigured) {
    try {
      const data = await invokeEdge('get-next-question', { workspaceId, topic, subject, target, excludeIds })
      if (data?.question) return data.question
    } catch { /* lanjut ke fallback lokal */ }
  }
  const q = await pickQuestionLocally({ workspaceId, topic, subject, target, excludeIds })
  localAnswerKeyCache.set(q.id, q)
  return sanitizeQuestion(q)
}

// Bank lokal (mode demo, atau fallback terakhir bila Edge Function produksi
// gagal total — dalam hal ini getQuestions() akan kosong karena RLS membatasi
// akses tabel `questions` mentah ke guru saja, sehingga otomatis jatuh ke
// demoAdaptiveQuestion). Mengembalikan soal APA ADANYA (belum disanitasi).
async function pickQuestionLocally({ workspaceId, topic, subject, target, excludeIds }) {
  const bank = await getQuestions({ workspaceId, topic, publishedOnly: true })
  const mcqCandidates = bank.filter(
    (q) => q.type === 'mcq' && !excludeIds.includes(q.id) &&
      (q.options || []).some((o) => o.bloom === target),
  )
  if (mcqCandidates.length) {
    return mcqCandidates[Math.floor(Math.random() * mcqCandidates.length)]
  }
  const essayCandidates = bank.filter(
    (q) => q.type === 'essay' && !excludeIds.includes(q.id) &&
      (q.bloom_target || []).includes(target),
  )
  if (essayCandidates.length) {
    return essayCandidates[Math.floor(Math.random() * essayCandidates.length)]
  }
  return demoAdaptiveQuestion({ topic, subject, target })
}

// Buka label Bloom/indikator/feedback untuk SATU opsi yang dipilih siswa —
// dipanggil tepat setelah "Kirim jawaban" diklik, bukan sebelumnya. Untuk
// soal dari get-next-question, lookup dilakukan Edge Function reveal-mcq-option
// (service role, memvalidasi keanggotaan workspace). Untuk soal lokal (demo/
// fallback), lookup dari cache di atas.
export async function revealMcqOption({ questionId, optionId }) {
  if (isSupabaseConfigured && !localAnswerKeyCache.has(questionId)) {
    return await invokeEdge('reveal-mcq-option', { questionId, optionId })
  }
  await delay(300) // latensi tipis agar transisi UI konsisten dengan jalur produksi
  const q = localAnswerKeyCache.get(questionId)
  const option = q?.options?.find((o) => o.id === optionId)
  if (!option) throw new Error('Opsi tidak ditemukan.')
  return { bloom: option.bloom, feedback: option.feedback || '', indicator: option.indicator || '' }
}

// Evaluasi jawaban esai via Gemini → bloom_level_achieved + feedback + followUpPrompt
export async function evaluateEssay({ answer, rubric, topic, subject, targetBloom }) {
  if (isSupabaseConfigured) {
    const data = await invokeEdge('evaluate-essay', { answer, rubric, topic, subject, targetBloom })
    return data
  }
  // Demo fallback: heuristic berdasarkan panjang jawaban
  await delay(1200)
  const wordCount = answer.trim().split(/\s+/).length
  const level = wordCount < 20 ? 'C1' : wordCount < 50 ? 'C2' : wordCount < 100 ? 'C3' : wordCount < 150 ? 'C4' : 'C5'
  return {
    bloom_level_achieved: level,
    feedback: `Jawabanmu menunjukkan karakteristik berpikir ${level} (${wordCount} kata). Coba perluas dengan menghubungkan konsep ke situasi nyata.`,
    followUpPrompt: `Bagaimana kamu akan menerapkan konsep ini jika kondisinya berubah menjadi berbeda?`,
  }
}

// RF-11: evaluasi apakah alasan siswa untuk opsi bernalar C4+ benar-benar
// menunjukkan penalaran level tsb (bukan sekadar tebakan/template).
export async function evaluateJustification({ questionPrompt, optionText, bloomClaimed, justification, topic, subject }) {
  if (isSupabaseConfigured) {
    return await invokeEdge('evaluate-justification', { questionPrompt, optionText, bloomClaimed, justification, topic, subject })
  }
  // Demo fallback: heuristik panjang alasan (Edge Function produksi memakai Gemini)
  await delay(900)
  const wordCount = justification.trim().split(/\s+/).filter(Boolean).length
  const verified = wordCount >= 8
  return {
    verified,
    feedback: verified
      ? `Alasanmu cukup menjelaskan mengapa jawaban ini menunjukkan penalaran ${bloomClaimed}.`
      : `Alasanmu masih terlalu singkat untuk menunjukkan penalaran level ${bloomClaimed} — jelaskan "mengapa", bukan hanya "apa".`,
  }
}

// Update bloom_profiles secara live (per-jawaban) — fire-and-forget, tanpa increment session_count
export async function updateLiveBloomSnapshot(sessionId) {
  if (isSupabaseConfigured) {
    invokeEdge('update-bloom-profile', { sessionId, live: true }).catch(() => {})
    return
  }
  // Demo: dispatch event agar heatmap guru ter-refresh
  window.dispatchEvent(new CustomEvent('vsc:bloom-updated', { detail: { sessionId } }))
}

export async function recordAnswer(sessionId, answer) {
  if (isSupabaseConfigured) {
    await supabase.from('session_answers').insert({ session_id: sessionId, ...answer })
    // Snapshot atomik per-jawaban agar heatmap guru ter-update live
    updateLiveBloomSnapshot(sessionId)
    return
  }
  const db = loadDB()
  db.session_answers.push({ id: newId(), session_id: sessionId, ...answer, answered_at: new Date().toISOString() })
  saveDB(db)
  updateLiveBloomSnapshot(sessionId)
}

export async function completeSession({ sessionId, workspaceId, userId, topic, answers }) {
  const lvlCounts = answers.reduce((acc, a) => {
    const l = levelOf(a.bloom_chosen); acc[l] = (acc[l] || 0) + 1; return acc
  }, {})
  const finalLevel = Math.max(1, Number(
    Object.entries(lvlCounts).sort(([a, ca], [b, cb]) => cb - ca || Number(b) - Number(a))[0][0]
  ))
  if (isSupabaseConfigured) {
    await supabase.from('sessions')
      .update({ completed_at: new Date().toISOString(), bloom_level: finalLevel, item_count: answers.length })
      .eq('id', sessionId)
    // Edge Function menghitung & meng-upsert bloom_profiles
    const data = await invokeEdge('update-bloom-profile', { sessionId })
    return data?.profile || null
  }
  const db = loadDB()
  const s = db.sessions.find((x) => x.id === sessionId)
  if (s) {
    s.completed_at = new Date().toISOString()
    s.bloom_level = finalLevel
    s.item_count = answers.length
  }
  const old = db.bloom_profiles.find(
    (p) => p.user_id === userId && p.workspace_id === workspaceId && p.topic === topic,
  )
  const updated = computeProfileUpdate(
    old || { id: newId(), user_id: userId, workspace_id: workspaceId, topic, c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, current_level: 1, trend: 0, session_count: 0 },
    answers,
  )
  if (old) Object.assign(old, updated)
  else db.bloom_profiles.push(updated)
  saveDB(db)
  // Beri tahu tab/komponen lain (pengganti Supabase Realtime di mode demo)
  window.dispatchEvent(new CustomEvent('vsc:bloom-updated', { detail: { workspaceId } }))
  return updated
}

// ---------------------------------------------------------------------------
// PROFIL & ANALITIK
// ---------------------------------------------------------------------------

export async function getBloomProfiles(workspaceId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('bloom_profiles')
      .select('*, profiles(full_name)')
      .eq('workspace_id', workspaceId)
    if (error) throw error
    return data.map((p) => ({ ...p, full_name: p.profiles?.full_name || '—' }))
  }
  const db = loadDB()
  return db.bloom_profiles
    .filter((p) => p.workspace_id === workspaceId)
    .map((p) => ({ ...p, full_name: db.users.find((u) => u.id === p.user_id)?.full_name || '—' }))
}

export async function getMyProfiles(userId, workspaceId) {
  if (isSupabaseConfigured) {
    let q = supabase.from('bloom_profiles').select('*').eq('user_id', userId)
    if (workspaceId) q = q.eq('workspace_id', workspaceId)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  return loadDB().bloom_profiles.filter(
    (p) => p.user_id === userId && (!workspaceId || p.workspace_id === workspaceId),
  )
}

export async function getSessions({ workspaceId, userId }) {
  if (isSupabaseConfigured) {
    let q = supabase.from('sessions').select('*')
      .eq('workspace_id', workspaceId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: true })
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  return loadDB().sessions
    .filter((s) => s.workspace_id === workspaceId && s.completed_at && (!userId || s.user_id === userId))
    .sort((a, b) => (a.started_at > b.started_at ? 1 : -1))
}

// Statistik dashboard guru (4 stat cards)
export async function getClassStats(workspaceId) {
  const [profiles, questions, sessions] = await Promise.all([
    getBloomProfiles(workspaceId),
    getQuestions({ workspaceId }),
    getSessions({ workspaceId }),
  ])
  const weekAgo    = Date.now() - 7  * 86400000
  const twoWeekAgo = Date.now() - 14 * 86400000

  const aiThisWeek = questions.filter((q) => new Date(q.created_at).getTime() >= weekAgo).length
  const attention  = profiles.filter((p) => p.current_level <= 1 || p.trend < 0).length
  const avg        = profiles.length
    ? profiles.reduce((s, p) => s + p.current_level, 0) / profiles.length
    : 0

  // % siswa naik ≥1 Bloom Level dalam 14 hari terakhir
  // Bandingkan sesi pertama vs terakhir dalam window per siswa (butuh ≥2 sesi)
  const recentSess = sessions.filter(
    (s) => s.completed_at && new Date(s.completed_at).getTime() >= twoWeekAgo && s.bloom_level,
  )
  const activeIds = [...new Set(recentSess.map((s) => s.user_id))]
  const roseCount = activeIds.filter((uid) => {
    const sorted = recentSess
      .filter((s) => s.user_id === uid)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    return sorted.length >= 2 && sorted.at(-1).bloom_level > sorted[0].bloom_level
  }).length
  const levelUpPct = activeIds.length > 0 ? Math.round((roseCount / activeIds.length) * 100) : 0

  return { aiThisWeek, levelUp: levelUpPct, attention, avgLevel: avg }
}

// Pola kesalahan/miskonsepsi per topik (guru — Modul 5): agregasi session_answers
// di mana bloom_chosen < bloom_target, dikelompokkan per topik.
export async function getMisconceptions(workspaceId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('session_answers')
      .select('bloom_chosen, bloom_target, sessions!inner(workspace_id, topic)')
      .eq('sessions.workspace_id', workspaceId)
    if (error) throw error
    return summarizeMisconceptions(data.map((a) => ({ ...a, topic: a.sessions.topic })))
  }
  const db = loadDB()
  const topicOf = new Map(db.sessions.filter((s) => s.workspace_id === workspaceId).map((s) => [s.id, s.topic]))
  const answers = db.session_answers
    .filter((a) => topicOf.has(a.session_id))
    .map((a) => ({ ...a, topic: topicOf.get(a.session_id) }))
  return summarizeMisconceptions(answers)
}

// ---------------------------------------------------------------------------
// VARK LEARNING STYLE
// ---------------------------------------------------------------------------

export async function getVarkStyle(userId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('vark_style').eq('id', userId).maybeSingle()
    return data?.vark_style || null
  }
  const u = loadDB().users.find((x) => x.id === userId)
  return u?.vark_style || null
}

export async function saveVarkStyle(userId, style) {
  if (isSupabaseConfigured) {
    await supabase.from('profiles').update({ vark_style: style }).eq('id', userId)
    return
  }
  const db = loadDB()
  const u = db.users.find((x) => x.id === userId)
  if (u) { u.vark_style = style; saveDB(db) }
}

// ---------------------------------------------------------------------------
// REKOMENDASI SISWA (Gemini via Edge Function; demo: template lokal)
// ---------------------------------------------------------------------------

export async function getStudentRecs(userId, workspaceId, topic, varkStyle) {
  if (isSupabaseConfigured) {
    return await invokeEdge('get-recommendations', { userId, workspaceId, topic, varkStyle })
  }
  const p = loadDB().bloom_profiles.find(
    (x) => x.user_id === userId && x.workspace_id === workspaceId && x.topic === topic,
  ) || null
  const { weakest, recs } = buildStudentRecs(p)
  return { studentRecs: recs, weakest }
}

// ---------------------------------------------------------------------------
// PROYEK MINI — PENGUMPULAN LAPORAN SISWA
// ---------------------------------------------------------------------------

const PROJECT_BUCKET = 'project-files'

// Mengunggah file laporan ke Supabase Storage sebelum mencatat submission.
// Path: {workspaceId}/{userId}/{timestamp}_{filename} — dipakai juga oleh
// RLS storage.objects untuk menentukan kepemilikan & keanggotaan workspace.
export async function uploadProjectFile({ workspaceId, userId, file }) {
  if (!isSupabaseConfigured) return null
  const path = `${workspaceId}/${userId}/${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from(PROJECT_BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export async function getProjectFileUrl(filePath) {
  if (!isSupabaseConfigured || !filePath) return null
  const { data, error } = await supabase.storage
    .from(PROJECT_BUCKET)
    .createSignedUrl(filePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}

export async function submitProject({ workspaceId, userId, topic, fileName, fileSize, filePath, description }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('project_submissions')
      .insert({ workspace_id: workspaceId, user_id: userId, topic, file_name: fileName, file_size: fileSize, file_path: filePath, description })
      .select().single()
    if (error) throw error
    return data
  }
  const db = loadDB()
  if (!db.project_submissions) db.project_submissions = []
  const submission = {
    id: newId(), workspace_id: workspaceId, user_id: userId, topic,
    file_name: fileName, file_size: fileSize, file_path: filePath, description,
    submitted_at: new Date().toISOString(),
  }
  db.project_submissions.push(submission)
  saveDB(db)
  return submission
}

// Guru meninjau & memberi nilai laporan proyek (Modul 6).
export async function reviewProjectSubmission(id, { score, teacherFeedback }) {
  const patch = { score, teacher_feedback: teacherFeedback, reviewed_at: new Date().toISOString() }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('project_submissions').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const db = loadDB()
  const list = db.project_submissions || []
  const i = list.findIndex((s) => s.id === id)
  if (i < 0) return null
  list[i] = { ...list[i], ...patch }
  saveDB(db)
  return list[i]
}

export async function getProjectSubmissions(workspaceId, topic) {
  if (isSupabaseConfigured) {
    let q = supabase
      .from('project_submissions')
      .select('*, profiles(full_name)')
      .eq('workspace_id', workspaceId)
      .order('submitted_at', { ascending: false })
    if (topic) q = q.eq('topic', topic)
    const { data, error } = await q
    if (error) throw error
    return data.map((s) => ({ ...s, full_name: s.profiles?.full_name || '—' }))
  }
  const db = loadDB()
  return (db.project_submissions || [])
    .filter((s) => s.workspace_id === workspaceId && (!topic || s.topic === topic))
    .map((s) => ({ ...s, full_name: db.users.find((u) => u.id === s.user_id)?.full_name || '—' }))
    .sort((a, b) => (a.submitted_at > b.submitted_at ? -1 : 1))
}
