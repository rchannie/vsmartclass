// Edge Function: generate-questions
// Input : { subject, topic, grade, type, count, maxBloom, workspaceId }
// Output: { questions: Question[] }  — sudah tersimpan di tabel `questions` (published=false)
// Secrets: GEMINI_API_KEY
//
// Dipanggil guru secara eksplisit (menu "Buat Soal") — mengembalikan soal
// APA ADANYA termasuk label Bloom & feedback per opsi, karena guru memang
// perlu meninjau/mengedit jawaban sebelum publish. Untuk soal yang dilihat
// SISWA selama sesi adaptif, lihat get-next-question (yang mensanitasi opsi)
// dan reveal-mcq-option (yang membuka label hanya untuk opsi yang dipilih).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit, getUserId, rateLimitResponse } from '../_shared/rateLimit.ts'
import { buildQuestionRows, generateQuestionsViaGemini } from '../_shared/generateQuestions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { subject, topic, grade, type, count, maxBloom, workspaceId } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const createdBy = await getUserId(req, supabase)

    const rate = await checkRateLimit(supabase, createdBy)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs!, corsHeaders)

    if (!workspaceId || !topic || !subject) {
      throw new Error('workspaceId, subject, dan topic wajib diisi.')
    }
    if (type !== 'mcq' && type !== 'essay') {
      throw new Error('type harus "mcq" atau "essay".')
    }
    // Selaras dengan slider di QuestionGenerator.jsx (maks 15) — mencegah
    // permintaan tidak wajar menghabiskan kuota Gemini dalam satu panggilan.
    const safeCount = Math.min(15, Math.max(1, Number(count) || 1))

    const items = await generateQuestionsViaGemini({ subject, topic, grade, type, count: safeCount, maxBloom })
    const rows = buildQuestionRows(items, { workspaceId, createdBy, subject, topic, type })

    const { data: saved, error } = await supabase.from('questions').insert(rows).select()
    if (error) {
      console.error('Insert error:', JSON.stringify(error, null, 2))
      console.error('Attempted rows:', JSON.stringify(rows, null, 2))
      throw new Error(`Failed to insert questions: ${error.message || error}`)
    }

    return new Response(JSON.stringify({ questions: saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
