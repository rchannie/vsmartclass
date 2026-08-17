// Logika bersama pembuatan soal via Gemini — dipakai oleh generate-questions
// (guru meminta eksplisit) dan get-next-question (adaptif on-the-fly saat
// bank soal tidak punya kandidat untuk target level saat ini).

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export function buildQuestionPrompt(
  { subject, topic, grade, type, count, maxBloom }: {
    subject: string; topic: string; grade: string; type: string; count: number; maxBloom?: string
  },
) {
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

export async function generateQuestionsViaGemini(
  params: { subject: string; topic: string; grade: string; type: string; count: number; maxBloom?: string },
): Promise<Array<Record<string, unknown>>> {
  const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildQuestionPrompt(params) }] }],
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
  return (parsed.questions ?? []) as Array<Record<string, unknown>>
}

export function buildQuestionRows(
  items: Array<Record<string, unknown>>,
  { workspaceId, createdBy, subject, topic, type }: {
    workspaceId: string; createdBy: string | null; subject: string; topic: string; type: string
  },
) {
  return items.map((q) => ({
    workspace_id: workspaceId,
    created_by: createdBy,
    subject,
    topic,
    type: q.type ?? type ?? 'mcq',
    bloom_target: q.bloomTarget ?? q.bloom_target ?? [],
    prompt: q.prompt,
    options: q.options ?? null,
    rubric: q.rubric ?? null,
    published: false,
  }))
}

// Menghapus field bloom/indicator/feedback dari tiap opsi PG — inilah yang
// membuat pemetaan opsi->level Bloom TIDAK terlihat di Network tab/DevTools
// siswa sebelum mereka menjawab (lihat AUDIT.md §2.2). Dipakai oleh
// get-next-question sebelum mengirim soal ke klien; label sesungguhnya hanya
// dibuka lewat reveal-mcq-option setelah siswa benar-benar memilih opsi.
export function sanitizeQuestionRow(row: Record<string, unknown>) {
  if (row.type !== 'mcq' || !Array.isArray(row.options)) return row
  return {
    ...row,
    options: (row.options as Array<Record<string, unknown>>).map((o) => ({ id: o.id, text: o.text })),
  }
}
