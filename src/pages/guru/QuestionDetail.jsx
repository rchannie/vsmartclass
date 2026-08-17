import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Trash2, EyeOff, PencilLine } from 'lucide-react'
import * as api from '../../lib/api'
import { BLOOM, BLOOM_LEVELS, softBg } from '../../lib/bloom'
import BloomBadge from '../../components/bloom/BloomBadge'
import QuestionCard from '../../components/questions/QuestionCard'

export default function QuestionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: q, isLoading, refetch } = useQuery({
    queryKey: ['question', id],
    queryFn: () => api.getQuestion(id),
  })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftOptions, setDraftOptions] = useState([])
  const [draftRubric, setDraftRubric] = useState([])

  if (isLoading) return <p className="text-sm text-muted">Memuat soal…</p>
  if (!q) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Soal tidak ditemukan.</p>
        <Link to="/guru/dashboard" className="btn-outline text-xs"><ArrowLeft size={14} /> Kembali</Link>
      </div>
    )
  }

  const startEdit = () => {
    setDraft(q.prompt)
    setDraftOptions((q.options || []).map((o) => ({ ...o })))
    setDraftRubric((q.rubric || []).map((r) => ({ ...r })))
    setEditing(true)
  }

  const setPublished = async (published) => {
    await api.updateQuestion(q.id, { published })
    qc.invalidateQueries({ queryKey: ['questions'] })
    qc.invalidateQueries({ queryKey: ['public-questions'] })
    qc.invalidateQueries({ queryKey: ['class-stats'] })
    refetch()
  }

  const remove = async () => {
    if (!confirm('Hapus soal ini dari bank soal?')) return
    await api.deleteQuestion(q.id)
    qc.invalidateQueries({ queryKey: ['questions'] })
    qc.invalidateQueries({ queryKey: ['public-questions'] })
    qc.invalidateQueries({ queryKey: ['class-stats'] })
    navigate(-1)
  }

  const saveEdit = async () => {
    const updates = { prompt: draft }
    if (q.type === 'mcq') updates.options = draftOptions
    if (q.type === 'essay') updates.rubric = draftRubric
    await api.updateQuestion(q.id, updates)
    qc.invalidateQueries({ queryKey: ['questions'] })
    qc.invalidateQueries({ queryKey: ['public-questions'] })
    setEditing(false)
    refetch()
  }

  const setOption = (idx, field, value) =>
    setDraftOptions((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))

  const setRubric = (idx, field, value) =>
    setDraftRubric((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost !px-2 text-xs">
          <ArrowLeft size={14} /> Kembali
        </button>
        <div className="flex gap-2">
          {!editing && (
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={startEdit}>
              <PencilLine size={13} /> Edit
            </button>
          )}
          {q.published ? (
            <button type="button" className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => setPublished(false)}>
              <EyeOff size={13} /> Tarik dari kelas
            </button>
          ) : (
            <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => setPublished(true)}>
              <Send size={13} /> Publikasikan ke kelas
            </button>
          )}
          <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs hover:!text-c6" onClick={remove}>
            <Trash2 size={13} /> Hapus
          </button>
        </div>
      </header>

      <p className="text-xs text-muted">
        {q.subject} · {q.topic} · {q.published ? 'Terbit di kelas' : 'Draf (belum terbit)'}
      </p>

      {editing ? (
        <div className="card space-y-5 p-5">
          {/* Edit pertanyaan */}
          <div className="space-y-1.5">
            <label className="label">Pertanyaan</label>
            <textarea className="input min-h-24" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>

          {/* Edit opsi (MCQ) */}
          {q.type === 'mcq' && draftOptions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Opsi jawaban</p>
              {draftOptions.map((opt, i) => (
                <div
                  key={opt.id}
                  className="space-y-2 rounded-md border-l-4 p-3.5"
                  style={{ borderLeftColor: BLOOM[opt.bloom]?.color || 'var(--border)', background: softBg(opt.bloom, 6) }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted w-5 shrink-0">{opt.id}.</span>
                    {/* Bloom selector */}
                    <div className="flex gap-1">
                      {BLOOM_LEVELS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setOption(i, 'bloom', code)}
                          className="rounded-pill px-2 py-0.5 text-[10px] font-bold transition-all"
                          style={{
                            background: opt.bloom === code ? BLOOM[code].color : 'var(--bg)',
                            color: opt.bloom === code ? '#fff' : 'var(--muted)',
                            outline: opt.bloom === code ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                    <BloomBadge code={opt.bloom} size="sm" />
                  </div>
                  <textarea
                    className="input min-h-[60px] text-sm"
                    value={opt.text}
                    onChange={(e) => setOption(i, 'text', e.target.value)}
                    placeholder="Teks opsi…"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Edit rubrik (Esai) */}
          {q.type === 'essay' && draftRubric.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Rubrik penilaian</p>
              {draftRubric.map((r, i) => (
                <div
                  key={r.bloom}
                  className="space-y-2 rounded-md border-l-4 p-3.5"
                  style={{ borderLeftColor: BLOOM[r.bloom]?.color || 'var(--border)', background: softBg(r.bloom, 6) }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {BLOOM_LEVELS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setRubric(i, 'bloom', code)}
                          className="rounded-pill px-2 py-0.5 text-[10px] font-bold transition-all"
                          style={{
                            background: r.bloom === code ? BLOOM[code].color : 'var(--bg)',
                            color: r.bloom === code ? '#fff' : 'var(--muted)',
                            outline: r.bloom === code ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                    <BloomBadge code={r.bloom} size="sm" />
                  </div>
                  <textarea
                    className="input min-h-[60px] text-sm"
                    value={r.desc}
                    onChange={(e) => setRubric(i, 'desc', e.target.value)}
                    placeholder="Deskripsi kriteria…"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 border-t border-line pt-4">
            <button type="button" className="btn-primary !py-2 text-xs" onClick={saveEdit}>Simpan perubahan</button>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setEditing(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <QuestionCard question={q} />
      )}
    </div>
  )
}
