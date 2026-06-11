import { useState } from 'react'
import { Eye, Volume2, BookOpen, Zap, CheckCircle2 } from 'lucide-react'

const VARK_META = {
  V: { label: 'Visual',       icon: Eye,       color: 'var(--c4)', desc: 'Belajar lewat diagram, grafik, dan visualisasi' },
  A: { label: 'Auditori',     icon: Volume2,    color: 'var(--c3)', desc: 'Belajar lewat penjelasan lisan dan diskusi' },
  R: { label: 'Baca-Tulis',   icon: BookOpen,   color: 'var(--c2)', desc: 'Belajar lewat teks dan membuat catatan' },
  K: { label: 'Kinestetik',   icon: Zap,        color: 'var(--c5)', desc: 'Belajar lewat praktik dan mencoba langsung' },
}

const QUESTIONS = [
  {
    q: 'Ketika mempelajari topik baru, kamu lebih mudah mengerti dengan:',
    options: [
      { code: 'V', text: 'Melihat diagram, grafik, atau peta konsep' },
      { code: 'A', text: 'Mendengarkan penjelasan guru atau berdiskusi' },
      { code: 'R', text: 'Membaca ringkasan atau catatan tertulis' },
      { code: 'K', text: 'Langsung mencoba mengerjakan contoh soal' },
    ],
  },
  {
    q: 'Saat mengingat kembali materi sebelum ujian, kamu paling sering:',
    options: [
      { code: 'V', text: 'Membayangkan tampilan gambar, tabel, atau halaman catatan' },
      { code: 'A', text: 'Mengulang penjelasan dalam pikiran atau membahasnya dengan teman' },
      { code: 'R', text: 'Membaca ulang ringkasan yang sudah kamu buat' },
      { code: 'K', text: 'Mengerjakan latihan soal lagi sampai lancar' },
    ],
  },
  {
    q: 'Ketika ada konsep yang sulit dipahami, kamu akan:',
    options: [
      { code: 'V', text: 'Menggambar bagan atau sketsa untuk memperjelas' },
      { code: 'A', text: 'Bertanya langsung ke guru atau mendiskusikan dengan teman' },
      { code: 'R', text: 'Mencari penjelasan tertulis yang lebih lengkap' },
      { code: 'K', text: 'Langsung mencoba menerapkannya ke soal nyata' },
    ],
  },
  {
    q: 'Kamu merasa paling berhasil belajar ketika:',
    options: [
      { code: 'V', text: 'Ada infografis, video, atau tampilan visual yang jelas' },
      { code: 'A', text: 'Ada sesi diskusi atau tanya jawab langsung' },
      { code: 'R', text: 'Aku membuat rangkuman atau catatan sendiri' },
      { code: 'K', text: 'Praktik berulang sampai prosedurnya jadi otomatis' },
    ],
  },
]

function dominantStyle(answers) {
  const counts = { V: 0, A: 0, R: 0, K: 0 }
  answers.forEach((a) => { if (a) counts[a]++ })
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0]
}

export default function VarkSurvey({ onComplete }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null))
  const [submitting, setSubmitting] = useState(false)

  const allAnswered = answers.every(Boolean)

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    const style = dominantStyle(answers)
    await onComplete(style)
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="text-base font-extrabold">Kenali gaya belajarmu (VARK)</h2>
        <p className="mt-1 text-sm text-muted">
          4 pertanyaan singkat — rekomendasi belajarmu akan disesuaikan dengan caramu menyerap informasi.
        </p>
      </div>

      <div className="space-y-6">
        {QUESTIONS.map((q, qi) => (
          <div key={qi}>
            <p className="mb-3 text-sm font-bold">{qi + 1}. {q.q}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map(({ code, text }) => {
                const meta = VARK_META[code]
                const selected = answers[qi] === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAnswers((prev) => { const n = [...prev]; n[qi] = code; return n })}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 text-left text-sm transition-all ${
                      selected
                        ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/8 font-bold'
                        : 'border-line hover:border-[color:var(--accent)]/50 hover:bg-bg'
                    }`}
                  >
                    <meta.icon
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }}
                    />
                    <span className={selected ? 'text-ink' : 'text-muted'}>{text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="btn-primary w-full disabled:opacity-40"
      >
        <CheckCircle2 size={15} />
        {submitting ? 'Menyimpan...' : 'Simpan gaya belajar'}
      </button>
    </div>
  )
}

export { VARK_META }
