// Edge Function: get-recommendations
// Input : { userId, workspaceId, topic }
// Output: { studentRecs: [{bloom, title, why, type, minutes}], strategy, weakest }
// Membaca bloom_profiles → level terlemah → 3 rekomendasi via Gemini
// (fallback template bila Gemini gagal).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// gemini-1.5-flash sudah dipensiunkan untuk proyek baru — fallback berantai
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

const FALLBACK = [
  { bloom: 'C2', title: 'Jelaskan ulang dengan kata sendiri', why: 'Menjelaskan tanpa catatan menguatkan pemahaman.', type: 'Penguatan', minutes: 10 },
  { bloom: 'C3', title: 'Latihan soal bertahap terbimbing', why: 'Langkah kecil membangun keterampilan menerapkan.', type: 'Latihan', minutes: 20 },
  { bloom: 'C4', title: 'Bedah soal: temukan strukturnya', why: 'Membongkar struktur soal melatih analisis.', type: 'Visual', minutes: 15 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, workspaceId, topic } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile } = await supabase
      .from('bloom_profiles').select('*')
      .eq('user_id', userId).eq('workspace_id', workspaceId).eq('topic', topic)
      .maybeSingle()

    const vals = [1, 2, 3, 4, 5, 6].map((l) => (profile?.[`c${l}`] as number) ?? 0)
    const current = profile?.current_level ?? 1
    const relevant = vals.slice(0, Math.min(6, current + 1))
    const weakest = `C${relevant.indexOf(Math.min(...relevant)) + 1}`

    let studentRecs = FALLBACK
    try {
      const prompt = `
Kamu konselor belajar berbasis Taksonomi Bloom. Profil siswa (mastery 0-100):
C1=${vals[0]} C2=${vals[1]} C3=${vals[2]} C4=${vals[3]} C5=${vals[4]} C6=${vals[5]}.
Level saat ini: C${current}. Topik: "${topic}". Level terlemah: ${weakest}.

Buat TEPAT 3 rekomendasi aktivitas belajar berbahasa Indonesia:
1 penguatan level saat ini + 2 untuk naik level.
Output JSON murni: {"recs":[{"bloom":"C3","title":"...","why":"alasan mengapa cocok untuk siswa ini","type":"Visual|Latihan|Penguatan","minutes":15}]}
`.trim()

      for (const model of MODELS) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
            }),
          },
        )
        if (!res.ok) {
          if (res.status === 404) continue // model tak tersedia → coba berikutnya
          break // error lain (key/kuota) → pakai fallback template
        }
        const g = await res.json()
        const raw = (g.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}')
          .trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.recs) && parsed.recs.length === 3) studentRecs = parsed.recs
        break
      }
    } catch (_) { /* pakai fallback */ }

    const strategy =
      current <= 2 ? 'direct' : current === 3 ? 'cooperative' : current === 4 ? 'pbl' : 'exhibition'

    return new Response(JSON.stringify({ studentRecs, strategy, weakest }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
