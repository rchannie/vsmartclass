import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Loader2, FileText, FolderKanban, Search, PencilLine, Check } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useProjectSubmissions } from '../../hooks/useClassData'
import * as api from '../../lib/api'
import Panel from '../../components/ui/Panel'

// Modul 6 — Project Submission. Menu khusus guru untuk meninjau & mengunduh
// seluruh laporan proyek (bukti penguasaan C6) dari siswa di kelasnya,
// terlepas dari halaman Rekomendasi (yang fokus ke strategi mengajar).
export default function ProjectReports() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: submissions = [] } = useProjectSubmissions(active?.id)
  const [downloadingId, setDownloadingId] = useState(null)
  const [search, setSearch] = useState('')

  const handleDownload = async (submission) => {
    if (!submission.file_path) return
    setDownloadingId(submission.id)
    try {
      const url = await api.getProjectFileUrl(submission.file_path)
      if (url) window.open(url, '_blank', 'noopener')
    } finally {
      setDownloadingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q),
    )
  }, [submissions, search])

  const topicCounts = useMemo(() => {
    const m = new Map()
    submissions.forEach((s) => m.set(s.topic, (m.get(s.topic) || 0) + 1))
    return [...m.entries()]
  }, [submissions])

  const workspaceSelector = workspaces.length > 0 && (
    <select className="input !w-auto text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
      {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Proyek Siswa</h1>
          <p className="mt-1 text-sm text-muted">
            Laporan proyek mini sebagai bukti penguasaan C6 — Mencipta (Modul 6).
          </p>
        </div>
        {workspaceSelector}
      </header>

      {topicCounts.length > 0 && (
        <Panel title="Ringkasan per topik" subtitle={`${submissions.length} laporan masuk total`}>
          <div className="flex flex-wrap gap-2">
            {topicCounts.map(([topic, n]) => (
              <span key={topic} className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-bold">
                {topic} <span className="text-accent">{n}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Cari nama siswa atau topik…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {submissions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-accent">
            <FolderKanban size={22} />
          </span>
          <h3 className="mt-3 text-base">Belum ada laporan proyek</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Laporan akan muncul di sini begitu ada siswa yang mencapai C6 dan mengumpulkan proyek
            mininya lewat menu Proyek di akun mereka.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Tidak ada laporan yang cocok dengan pencarian.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SubmissionRow
              key={s.id}
              submission={s}
              downloading={downloadingId === s.id}
              onDownload={() => handleDownload(s)}
              onReviewed={() => qc.invalidateQueries({ queryKey: ['project-submissions', active?.id] })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Baris laporan + form nilai singkat (Modul 6 — "guru tinjau & beri nilai").
function SubmissionRow({ submission: s, downloading, onDownload, onReviewed }) {
  const [editing, setEditing] = useState(false)
  const [score, setScore] = useState(s.score ?? '')
  const [feedback, setFeedback] = useState(s.teacher_feedback ?? '')
  const [saving, setSaving] = useState(false)

  const isReviewed = s.reviewed_at != null

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.reviewProjectSubmission(s.id, {
        score: score === '' ? null : Number(score),
        teacherFeedback: feedback.trim() || null,
      })
      setEditing(false)
      onReviewed()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{s.full_name}</p>
          <p className="mt-0.5 text-xs text-muted">{s.topic}</p>
          {s.description && <p className="mt-1.5 text-xs leading-relaxed">{s.description}</p>}
        </div>
        <div className="shrink-0 text-right text-xs text-muted">
          {s.file_path ? (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 font-bold text-accent hover:underline disabled:opacity-50"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {s.file_name}
            </button>
          ) : (
            <p className="inline-flex items-center gap-1.5">
              <FileText size={12} /> {s.file_name}
            </p>
          )}
          <p className="mt-1">{new Date(s.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        {editing ? (
          <form onSubmit={save} className="flex flex-wrap items-end gap-2.5">
            <div>
              <label className="label" htmlFor={`score-${s.id}`}>Nilai (0–100)</label>
              <input
                id={`score-${s.id}`}
                type="number" min="0" max="100" className="input !w-24"
                value={score} onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="label" htmlFor={`fb-${s.id}`}>Catatan untuk siswa</label>
              <input
                id={`fb-${s.id}`}
                className="input" placeholder="Catatan singkat (opsional)"
                value={feedback} onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary !py-2 text-xs">
              {saving ? 'Menyimpan…' : 'Simpan nilai'}
            </button>
            <button type="button" className="btn-ghost !py-2 text-xs" onClick={() => setEditing(false)}>Batal</button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {isReviewed ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-pill bg-[color:var(--c3)]/10 px-2.5 py-1 font-extrabold text-[color:var(--c3)]">
                  <Check size={11} /> Nilai: {s.score ?? '—'}
                </span>
                {s.teacher_feedback && <span className="text-muted">{s.teacher_feedback}</span>}
              </div>
            ) : (
              <span className="text-xs text-muted">Belum dinilai</span>
            )}
            <button type="button" className="btn-ghost !px-2.5 !py-1.5 text-xs" onClick={() => setEditing(true)}>
              <PencilLine size={12} /> {isReviewed ? 'Ubah nilai' : 'Beri nilai'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
