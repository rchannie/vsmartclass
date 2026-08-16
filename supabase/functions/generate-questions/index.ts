// Edge Function: generate-questions
// Input : { subject, topic, grade, type, count, maxBloom, workspaceId, createdBy?, adaptive? }
// Output: { questions: Question[] }  — sudah tersimpan di tabel `questions` (published=false)
// Secrets: GEMINI_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRateLimit, getUserId, rateLimitResponse } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt({ subject, topic, grade, type, count, maxBloom }: Record<string, unknown>) {
  const maxLevel = String(maxBloom ?? 'C4').replace(/\D/g, '') || '4'
  return `
Kamu adalah asisten pendidik berbasis Taksonomi Bloom Revisi Anderson & Krathwohl.

Tugas: buat ${count} soal ${type === 'mcq' ? 'Pilihan Ganda' : 'Esai'} untuk mapel
${subject}, topik "${topic}", jenjang SMA kelas ${grade}.

Untuk Pilihan Ganda:
- Setiap soal punya 4 opsi (A–D).
- Setiap opsi HARUS mewakili level Bloom yang BERBEDA (C1 s.d. maks C${maxLevel}).
- Urutkan opsi dari level terendah ke tertinggi.
- Setiap opsi punya: text (jawaban), bloom (mis. "C3"), indicator (1 kalimat
  deskripsi proses kognitif yang terjadi), feedback (1–2 kalimat formatif untuk siswa).
- Tidak ada "opsi benar" tunggal — semua opsi valid di level-nya masing-masing.

Untuk Esai:
- 1 soal terbuka yang bisa dijawab di berbagai kedalaman kognitif.
- Rubrik: 4 kriteria masing-masing untuk C2, C3, C4, C5 (field "rubric": [{bloom, desc}]).

Output: JSON murni, tidak ada teks lain di luar JSON.
Schema:
{
  "questions": [{
    "prompt": "...",
    "type": "${type}",
    "bloomTarget": ["C1","C2","C3","C4"],
    "options": [{ "id":"A","text":"...","bloom":"C1","indicator":"...","feedback":"..." }],
    "rubric": null
  }]
}
`.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { subject, topic, workspaceId } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const createdBy = await getUserId(req, supabase)

    const rate = await checkRateLimit(supabase, createdBy)
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterMs!, corsHeaders)

    const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(body) }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
      }),
    })
    if (!geminiRes.ok) {
      const detail = (await geminiRes.text()).slice(0, 400)
      throw new Error(`Gemini error ${geminiRes.status}: ${detail}`)
    }

    const gemini = await geminiRes.json()
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text)
    const items = (parsed.questions ?? []) as Array<Record<string, unknown>>

    // Simpan ke tabel questions (published=false) dengan service role
    const rows = items.map((q) => ({
      workspace_id: workspaceId,
      created_by: createdBy,
      subject,
      topic,
      type: q.type ?? body.type ?? 'mcq',
      bloom_target: q.bloomTarget ?? q.bloom_target ?? [],
      prompt: q.prompt,
      options: q.options ?? null,
      rubric: q.rubric ?? null,
      published: false,
    }))

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
