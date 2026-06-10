import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Send, RefreshCcw, PencilLine, Check } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import * as api from '../../lib/api'
import { BLOOM_LEVELS, BLOOM, levelOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import Segmented from '../../components/ui/Segmented'
import AIThinking from '../../components/ui/AIThinking'
import QuestionCard from '../../components/questions/QuestionCard'

const SUBJECTS = ['Matematika', 'Fisika', 'Biologi', 'Sejarah', 'Ekonomi', 'Lainnya…']

export default function QuestionGenerator() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const qc = useQueryClient()

  const [form, setForm] = useState({
    subject: 'Matematika',
    customSubject: '',
    topic: '',
    grade: 'XI',
    type: 'mcq',
    count: 5,
    maxBloom: 'C4',
  })
  const [phase, setPhase] = useState('idle') // idle | generating | results
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  const subject = form.subject === 'Lainnya…' ? form.customSubject : form.subject

  const generate = async (e) => {
    e?.preventDefault()
    if (!active) return setError('Buat atau pilih workspace dulu di Dashboard.')
    setError('')
    setPhase('generating')
    try {
      // regenerate = ganti baris lama: buang draf hasil sebelumnya yang belum terbit
      await Promise.all(results.filter((q) => !q.published).map((q) => api.deleteQuestion(q.id)))
      const questions = await api.generateQuestions({
        subject, topic: form.topic, grade: form.grade, type: form.type,
        count: form.count, maxBloom: form.maxBloom,
        workspaceId: active.id, createdBy: user.id,
      })
      // simpan ke bank soal (published=false); regenerate = baris baru menggantikan hasil di layar
      const saved = await api.saveQuestions(questions.map((q) => ({ ...q, published: false })))
      setResults(saved)
      setPhase('results')
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['class-stats'] })
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Coba lagi.')
      setPhase('idle')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Smart Question Generator</h1>
        <p className="mt-1 text-sm text-muted">
          Soal berlabel Taksonomi Bloom — setiap opsi mewakili level kognitif berbeda, tidak ada jawaban salah.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-5">
        {/* Form parameter */}
        <Panel title="Parameter soal" subtitle="Atur konteks, AI menyusun soalnya" className="lg:col-span-2">
          <form onSubmit={generate} className="space-y-4">
            <div>
              <label className="label">Workspace tujuan</label>
              <select className="input" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
                {workspaces.length === 0 && <option value="">— belum ada workspace —</option>}
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Mata pelajaran</label>
              <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
              {form.subject === 'Lainnya…' && (
                <input
                  className="input mt-2" required placeholder="Tulis mata pelajaran"
                  value={form.customSubject}
                  onChange={(e) => setForm({ ...form, customSubject: e.target.value })}
                />
              )}
            </div>

            <div>
              <label className="label">Topik</label>
              <input
                className="input" required placeholder="cth. Sistem Persamaan Linear"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Jenjang</label>
                <Segmented options={['X', 'XI', 'XII']} value={form.grade} onChange={(grade) => setForm({ ...form, grade })} />
              </div>
              <div>
                <label className="label">Tipe soal</label>
                <Segmented
                  options={[{ value: 'mcq', label: 'Pilihan Ganda' }, { value: 'essay', label: 'Esai' }]}
                  value={form.type}
                  onChange={(type) => setForm({ ...form, type })}
                />
              </div>
            </div>

            <div>
              <label className="label">Jumlah soal: <span className="font-mono text-accent">{form.count}</span></label>
              <input
                type="range" min="1" max="15" value={form.count}
                onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <label className="label">Target Bloom maksimum</label>
              <div className="flex gap-1.5">
                {BLOOM_LEVELS.map((code) => {
                  const inRange = levelOf(code) <= levelOf(form.maxBloom)
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setForm({ ...form, maxBloom: code })}
                      className="flex-1 rounded-md border py-2 font-mono text-xs font-bold transition-all"
                      style={
                        inRange
                          ? { background: BLOOM[code].color, borderColor: BLOOM[code].color, color: '#fff' }
                          : { borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface)' }
                      }
                      title={`${code} · ${BLOOM[code].name}`}
                    >
                      {code}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Opsi soal mencakup level sampai {form.maxBloom} · {BLOOM[form.maxBloom].name}
              </p>
            </div>

            {error && <p className="rounded-md border border-c6 px-3 py-2 text-xs font-bold text-c6">{error}</p>}

            <button type="submit" disabled={phase === 'generating'} className="btn-primary w-full">
              <Sparkles size={16} />
              {phase === 'generating' ? 'Menyusun soal…' : 'Generate dengan AI'}
            </button>
          </form>
        </Panel>

        {/* Hasil */}
        <div className="space-y-4 lg:col-span-3">
          {phase === 'idle' && (
            <div className="card flex flex-col items-center justify-center p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-accent">
                <Sparkles size={22} />
              </span>
              <h3 className="mt-3 text-base">Hasil akan tampil di sini</h3>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Isi parameter di samping, lalu klik <span className="font-bold">Generate dengan AI</span>.
                Setiap opsi diberi label level Bloom beserta indikator kognitif dan feedback formatif.
              </p>
            </div>
          )}

          {phase === 'generating' && (
            <AIThinking label="AI sedang menyusun soal…" sub={`${form.count} soal · ${subject} · ${form.topic || 'topik'}`} />
          )}

          {phase === 'results' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold">{results.length} soal dihasilkan</p>
                <button type="button" onClick={generate} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <RefreshCcw size={13} /> Regenerate
                </button>
              </div>
              {results.map((q, i) => (
                <GeneratedQuestion
                  key={q.id}
                  question={q}
                  index={i}
                  onChange={(updated) =>
                    setResults((rs) => rs.map((x) => (x.id === updated.id ? updated : x)))
                  }
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GeneratedQuestion({ question, index, onChange }) {
  const qc = useQueryClient()
  const q = question
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(question.prompt)
  const [busy, setBusy] = useState(false)

  const publish = async () => {
    setBusy(true)
    const updated = await api.updateQuestion(q.id, { published: true })
    onChange(updated || { ...q, published: true })
    qc.invalidateQueries({ queryKey: ['questions'] })
    setBusy(false)
  }

  const saveEdit = async () => {
    const updated = await api.updateQuestion(q.id, { prompt: draft })
    onChange(updated || { ...q, prompt: draft })
    setEditing(false)
  }

  return (
    <div>
      {editing ? (
        <div className="card space-y-3 p-5">
          <label className="label">Edit pertanyaan</label>
          <textarea className="input min-h-24" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-2 text-xs" onClick={saveEdit}>Simpan</button>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setEditing(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <QuestionCard
          question={q}
          index={index}
          action={
            <div className="flex gap-1.5">
              <button type="button" className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => setEditing(true)}>
                <PencilLine size={13} /> Tinjau &amp; edit
              </button>
              {q.published ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-c3 px-2.5 py-1.5 text-xs font-bold text-white">
                  <Check size={13} /> Terbit
                </span>
              ) : (
                <button type="button" disabled={busy} className="btn-primary !px-2.5 !py-1.5 text-xs" onClick={publish}>
                  <Send size={13} /> Publikasikan ke kelas
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  )
}
