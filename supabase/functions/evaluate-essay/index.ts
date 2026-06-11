// Edge Function: evaluate-essay
// Input : { answer, rubric, topic, subject, targetBloom }
// Output: { bloom_level_achieved, feedback, followUpPrompt }
// Secrets: GEMINI_API_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt(answer: string, rubric: Array<{ bloom: string; desc: string }>, topic: string, subject: string) {
  const rubricText = rubric
    .map((r) => `- ${r.bloom}: ${r.desc}`)
    .join('\n')

  return `
Kamu adalah evaluator pendidikan berbasis Taksonomi Bloom Revisi (Anderson & Krathwohl).

Tugas: evaluasi jawaban siswa berikut untuk soal esai mapel ${subject}, topik "${topic}".

RUBRIK BLOOM:
${rubricText}

JAWABAN SISWA:
"${answer}"

Tentukan:
1. bloom_level_achieved: level Bloom tertinggi yang terbukti dalam jawaban (C1/C2/C3/C4/C5/C6). Gunakan rubrik sebagai acuan.
2. feedback: 2-3 kalimat konstruktif — jelaskan karakteristik berpikir yang teridentifikasi dan apa yang perlu dikembangkan.
3. followUpPrompt: 1 pertanyaan lanjutan untuk mendorong siswa naik ke level berikutnya.

Output: JSON murni, tidak ada teks lain.
{
  "bloom_level_achieved": "C3",
  "feedback": "...",
  "followUpPrompt": "..."
}
`.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { answer, rubric, topic, subject, targetBloom } = await req.json()

    if (!answer || !rubric?.length) {
      return new Response(
        JSON.stringify({ bloom_level_achieved: targetBloom || 'C2', feedback: 'Jawaban tidak lengkap.', followUpPrompt: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(answer, rubric, topic, subject) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    })
    if (!geminiRes.ok) throw new Error(`Gemini error ${geminiRes.status}`)

    const gemini = await geminiRes.json()
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const result = JSON.parse(text)

    return new Response(
      JSON.stringify({
        bloom_level_achieved: result.bloom_level_achieved || targetBloom || 'C2',
        feedback: result.feedback || '',
        followUpPrompt: result.followUpPrompt || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
