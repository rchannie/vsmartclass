// Edge Function: get-recommendations
// Input : { userId, workspaceId, topic, varkStyle? }
//   varkStyle: 'V' | 'A' | 'R' | 'K' (gaya belajar VARK siswa, opsional)
// Output: { studentRecs: [{bloom, title, why, type, minutes, resourceLabel, resourceUrl, challengeQuestion}], strategy, weakest }
// Membaca bloom_profiles → level terlemah → 3 rekomendasi via Gemini 2.5 Flash
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
    const { userId, workspaceId, topic, varkStyle } = await req.json()
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

    const VARK_LABELS: Record<string, string> = {
      V: 'Visual — lebih mudah belajar lewat diagram, grafik, dan visualisasi',
      A: 'Auditori — lebih mudah belajar lewat diskusi dan penjelasan lisan',
      R: 'Baca-Tulis — lebih mudah belajar lewat teks dan membuat catatan',
      K: 'Kinestetik — lebih mudah belajar lewat praktik dan mencoba langsung',
    }
    const varkLine = varkStyle && VARK_LABELS[varkStyle]
      ? `Gaya belajar siswa (VARK): ${VARK_LABELS[varkStyle]}.`
      : ''

    const TRUSTED_SOURCES: Record<string, { label: string; url: string }> = {
      C1: { label: 'Buat kartu belajar di Quizlet', url: 'https://quizlet.com' },
      C2: { label: 'Penjelasan video di Khan Academy', url: 'https://id.khanacademy.org' },
      C3: { label: 'Latihan soal di Khan Academy', url: 'https://id.khanacademy.org' },
      C4: { label: 'Sumber belajar Kemendikbud', url: 'https://belajar.kemdikbud.go.id' },
      C5: { label: 'Referensi lanjutan Kemendikbud', url: 'https://belajar.kemdikbud.go.id' },
      C6: { label: 'Sumber inspirasi proyek Kemendikbud', url: 'https://belajar.kemdikbud.go.id' },
    }

    let studentRecs = FALLBACK
    try {
      const prompt = `
Kamu konselor belajar berbasis Taksonomi Bloom. Profil siswa (mastery 0-100):
C1=${vals[0]} C2=${vals[1]} C3=${vals[2]} C4=${vals[3]} C5=${vals[4]} C6=${vals[5]}.
Level saat ini: C${current}. Topik: "${topic}". Level terlemah: ${weakest}.
${varkLine}

Buat TEPAT 3 rekomendasi aktivitas belajar berbahasa Indonesia:
1 penguatan level saat ini + 2 untuk naik level.
${varkLine ? 'Sesuaikan judul dan metode aktivitas dengan gaya belajar siswa di atas.' : ''}
Untuk setiap rekomendasi, sertakan juga:
- challengeQuestion: 1 pertanyaan terbuka yang mendorong siswa naik ke level berikutnya.
Output JSON murni (tanpa teks lain):
{"recs":[{"bloom":"C3","title":"...","why":"alasan mengapa cocok untuk siswa ini","type":"Visual|Latihan|Penguatan","minutes":15,"challengeQuestion":"..."}]}
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
        if (Array.isArray(parsed.recs) && parsed.recs.length === 3) {
          // Inject trusted resourceUrl/resourceLabel based on bloom level
          studentRecs = parsed.recs.map((r: Record<string, unknown>) => {
            const src = TRUSTED_SOURCES[(r.bloom as string) ?? 'C2'] || TRUSTED_SOURCES['C2']
            return { ...r, resourceLabel: src.label, resourceUrl: src.url }
          })
        }
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
