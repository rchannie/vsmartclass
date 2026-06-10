import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Trash2, EyeOff, PencilLine } from 'lucide-react'
import * as api from '../../lib/api'
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

  if (isLoading) return <p className="text-sm text-muted">Memuat soal…</p>
  if (!q) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Soal tidak ditemukan.</p>
        <Link to="/guru/dashboard" className="btn-outline text-xs"><ArrowLeft size={14} /> Kembali</Link>
      </div>
    )
  }

  const setPublished = async (published) => {
    await api.updateQuestion(q.id, { published })
    qc.invalidateQueries({ queryKey: ['questions'] })
    refetch()
  }

  const remove = async () => {
    if (!confirm('Hapus soal ini dari bank soal?')) return
    await api.deleteQuestion(q.id)
    qc.invalidateQueries({ queryKey: ['questions'] })
    navigate(-1)
  }

  const saveEdit = async () => {
    await api.updateQuestion(q.id, { prompt: draft })
    setEditing(false)
    refetch()
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost !px-2 text-xs">
          <ArrowLeft size={14} /> Kembali
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => { setDraft(q.prompt); setEditing(true) }}>
            <PencilLine size={13} /> Edit
          </button>
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
        <div className="card space-y-3 p-5">
          <label className="label">Edit pertanyaan</label>
          <textarea className="input min-h-24" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary !py-2 text-xs" onClick={saveEdit}>Simpan</button>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setEditing(false)}>Batal</button>
          </div>
        </div>
      ) : (
        <QuestionCard question={q} />
      )}
    </div>
  )
}
