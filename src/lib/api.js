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
import { levelOf } from './bloom'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const makeJoinCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return 'VSC-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function restoreSession() {
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    if (!user) return { user: null, profile: null }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
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
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    const profile = { id: data.user.id, full_name: fullName, role }
    const { error: pErr } = await supabase.from('profiles').insert(profile)
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

// ---------------------------------------------------------------------------
// WORKSPACE
// ---------------------------------------------------------------------------

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
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, school, subject, join_code, created_by: user.id })
      .select().single()
    if (error) throw error
    await supabase.from('workspace_members').insert({ workspace_id: data.id, user_id: user.id, role: 'guru' })
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
  const w = await findWorkspaceByCode(code)
  if (!w) throw new Error('Kode tidak ditemukan. Periksa kembali kode dari gurumu.')
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('workspace_members')
      .upsert({ workspace_id: w.id, user_id: user.id, role })
    if (error) throw error
    return w
  }
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
    return data.questions
  }
  // Simulasi latensi AI agar shimmer terlihat (UX rule #5)
  await delay(1800)
  return demoGenerateQuestions(params)
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

// Ambil soal berikutnya: dari bank (published, memuat level target) → fallback AI
export async function nextQuestion({ workspaceId, topic, subject, target, excludeIds = [] }) {
  const bank = await getQuestions({ workspaceId, topic, publishedOnly: true })
  const candidates = bank.filter(
    (q) => q.type === 'mcq' && !excludeIds.includes(q.id) &&
      (q.options || []).some((o) => o.bloom === target),
  )
  if (candidates.length) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
  if (isSupabaseConfigured) {
    try {
      const data = await invokeEdge('generate-questions', {
        subject, topic, grade: 'XI', type: 'mcq', count: 1, maxBloom: target, workspaceId, adaptive: true,
      })
      if (data?.questions?.length) return data.questions[0]
    } catch { /* lanjut ke fallback lokal */ }
  }
  return demoAdaptiveQuestion({ topic, subject, target })
}

export async function recordAnswer(sessionId, answer) {
  if (isSupabaseConfigured) {
    await supabase.from('session_answers').insert({ session_id: sessionId, ...answer })
    return
  }
  const db = loadDB()
  db.session_answers.push({ id: newId(), session_id: sessionId, ...answer, answered_at: new Date().toISOString() })
  saveDB(db)
}

export async function completeSession({ sessionId, workspaceId, userId, topic, answers }) {
  const finalLevel = Math.max(1, ...answers.map((a) => levelOf(a.bloom_chosen)))
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
  const [profiles, questions] = await Promise.all([
    getBloomProfiles(workspaceId),
    getQuestions({ workspaceId }),
  ])
  const weekAgo = Date.now() - 7 * 86400000
  const aiThisWeek = questions.filter((q) => new Date(q.created_at).getTime() >= weekAgo).length
  const levelUp = profiles.filter((p) => p.trend > 0).length
  const attention = profiles.filter((p) => p.current_level <= 1 || p.trend < 0).length
  const avg = profiles.length
    ? profiles.reduce((s, p) => s + p.current_level, 0) / profiles.length
    : 0
  return { aiThisWeek, levelUp, attention, avgLevel: avg }
}
