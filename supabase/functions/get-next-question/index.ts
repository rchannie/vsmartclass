// Edge Function: get-next-question (RF — mesin adaptif, sisi server)
// Input : { workspaceId, topic, subject, target, excludeIds? }
// Output: { question: Question }  — opsi PG SUDAH tersanitasi (hanya id+text,
//          tanpa bloom/indicator/feedback — lihat AUDIT.md §2.2)
//
// Menggantikan logika client-side lama yang memfilter bank soal berdasarkan
// `option.bloom === target`: pemilihan kandidat kini terjadi di server (yang
// punya akses penuh ke label Bloom lewat service role), sehingga klien tidak
// pernah menerima data mentah questions.options. Urutan pencarian:
//   1) Bank soal published bertipe PG dengan salah satu opsi = target
//   2) Bank soal published bertipe esai dengan bloom_target memuat target
//   3) Generate 1 soal PG baru via Gemini (disimpan published=false)
// Secrets: GEMINI_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit, getUserId, rateLimitResponse } from '../_shared/rateLimit.ts'
import { buildQuestionRows, generateQuestionsViaGemini, sanitizeQuestionRow } from '../_shared/generateQuestions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { workspaceId, topic, subject, target, excludeIds = [] } = await req.json()
    if (!workspaceId || !topic || !target) throw new Error('workspaceId, topic, dan target wajib diisi.')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userId = await getUserId(req, supabase)
    if (!userId) return json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, 401)

    const { data: member } = await supabase
      .from('workspace_members').select('user_id')
      .eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle()
    if (!member) return json({ error: 'Kamu bukan anggota kelas ini.' }, 403)

    const excluded = new Set<string>(excludeIds)
    const { data: bank } = await supabase
      .from('questions').select('*')
      .eq('workspace_id', workspaceId).eq('topic', topic).eq('published', true)

    const mcqCandidates = (bank ?? []).filter(
      (q) => q.type === 'mcq' && !excluded.has(q.id) &&
        (q.options ?? []).some((o: Record<string, unknown>) => o.bloom === target),
    )
    if (mcqCandidates.length) {
      return json({ question: sanitizeQuestionRow(pickRandom(mcqCandidates)) })
    }

    const essayCandidates = (bank ?? []).filter(
      (q) => q.type === 'essay' && !excluded.has(q.id) && (q.bloom_target ?? []).includes(target),
    )
    if (essayCandidates.length) {
      return json({ question: pickRandom(essayCandidates) }) // esai tidak perlu sanitasi (tanpa opsi)
    }

    // Tidak ada kandidat di bank — generate 1 soal PG baru untuk target ini.
    const rate = await checkRateLimit(supabase, userId)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs!, corsHeaders)

    const items = await generateQuestionsViaGemini({
      subject: subject || 'Umum', topic, grade: 'XI', type: 'mcq', count: 1, maxBloom: target,
    })
    const rows = buildQuestionRows(items, { workspaceId, createdBy: userId, subject: subject || 'Umum', topic, type: 'mcq' })
    const { data: saved, error } = await supabase.from('questions').insert(rows).select()
    if (error || !saved?.length) throw new Error(`Gagal membuat soal adaptif: ${error?.message || 'kosong'}`)

    return json({ question: sanitizeQuestionRow(saved[0]) })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
