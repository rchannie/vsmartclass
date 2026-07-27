import { useMemo, useState } from 'react'
import { Download, Loader2, FileText, FolderKanban, Search } from 'lucide-react'
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
            <div key={s.id} className="card flex items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">{s.full_name}</p>
                <p className="mt-0.5 text-xs text-muted">{s.topic}</p>
                {s.description && <p className="mt-1.5 text-xs leading-relaxed">{s.description}</p>}
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                {s.file_path ? (
                  <button
                    type="button"
                    onClick={() => handleDownload(s)}
                    disabled={downloadingId === s.id}
                    className="inline-flex items-center gap-1.5 font-bold text-accent hover:underline disabled:opacity-50"
                  >
                    {downloadingId === s.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
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
          ))}
        </div>
      )}
    </div>
  )
}
