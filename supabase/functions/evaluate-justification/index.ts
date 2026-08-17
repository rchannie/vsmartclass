// Edge Function: evaluate-justification (RF-11)
// Input : { questionPrompt, optionText, bloomClaimed, justification, topic, subject }
// Output: { verified: boolean, feedback: string }
// Secrets: GEMINI_API_KEY
//
// Untuk opsi Pilihan Ganda bernalar C4 ke atas, memilih opsi yang "kelihatan
// benar" saja tidak cukup — siswa harus menuliskan alasan singkat, dan Edge
// Function ini menilai apakah alasan itu BENAR-BENAR menunjukkan proses
// kognitif level tsb (analisis/evaluasi/mencipta), bukan sekadar mengulang
// opsi atau menebak. Hasil `verified=false` membuat klien menurunkan level
// yang tercatat satu tingkat untuk adaptasi & profil (lihat stores/session.js).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit, getUserId, rateLimitResponse } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt(
  questionPrompt: string, optionText: string, bloomClaimed: string,
  justification: string, topic: string, subject: string,
) {
  return `
Kamu evaluator pendidikan berbasis Taksonomi Bloom Revisi (Anderson & Krathwohl).

Seorang siswa memilih opsi jawaban berikut untuk soal mapel ${subject}, topik "${topic}":

SOAL: ${questionPrompt}
OPSI YANG DIPILIH (diklaim menunjukkan penalaran level ${bloomClaimed}): ${optionText}
ALASAN SISWA MEMILIH OPSI INI: "${justification}"

Level ${bloomClaimed} membutuhkan proses kognitif spesifik sesuai Taksonomi Bloom
(mis. C4 = menganalisis hubungan/struktur, C5 = menilai dengan kriteria, C6 =
mencipta/menggabungkan gagasan baru) — bukan sekadar mengingat atau memahami.

Nilai ALASAN siswa (bukan opsi yang dipilih): apakah alasan itu benar-benar
menunjukkan proses berpikir level ${bloomClaimed}, atau hanya mengulang teks
opsi / template generik / tebakan tanpa penalaran yang terlihat?

Output JSON murni, tidak ada teks lain di luar JSON:
{
  "verified": true,
  "feedback": "1-2 kalimat: jelaskan mengapa alasan ini kuat/lemah dan apa yang bisa ditingkatkan"
}
`.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { questionPrompt, optionText, bloomClaimed, justification, topic, subject } = await req.json()

    if (!justification || String(justification).trim().length < 5) {
      return new Response(
        JSON.stringify({ verified: false, feedback: 'Alasan terlalu singkat — coba jelaskan lebih detail mengapa kamu memilih opsi ini.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!questionPrompt || !optionText || !bloomClaimed || !topic || !subject) {
      throw new Error('questionPrompt, optionText, bloomClaimed, topic, dan subject wajib diisi.')
    }
    const cappedJustification = String(justification).length > 2000
      ? String(justification).slice(0, 2000)
      : justification

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const userId = await getUserId(req, supabase)
    const rate = await checkRateLimit(supabase, userId)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs!, corsHeaders)

    const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(questionPrompt, optionText, bloomClaimed, cappedJustification, topic, subject) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    })
    if (!geminiRes.ok) throw new Error(`Gemini error ${geminiRes.status}`)

    const gemini = await geminiRes.json()
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const result = JSON.parse(text)

    return new Response(
      JSON.stringify({
        verified: Boolean(result.verified),
        feedback: result.feedback || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    // Kegagalan evaluasi (kuota/timeout) tidak boleh memblokir sesi siswa —
    // klien (stores/session.js) menangkap error ini dan menganggap verified=true.
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
