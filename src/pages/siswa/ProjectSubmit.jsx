import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, Lock, Check } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { usePublicQuestions, useProjectSubmissions } from '../../hooks/useClassData'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import * as api from '../../lib/api'
import Panel from '../../components/ui/Panel'

const MAX_SIZE_MB = 10
const ACCEPTED = '.pdf,.doc,.docx'

export default function ProjectSubmit() {
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: questions = [] } = usePublicQuestions(active?.id)
  const { data: myProfiles = [], isLoading: loadingProfiles } = useMyBloomProfiles(user?.id)
  // RLS "projects read" hanya mengizinkan siswa baca barisnya sendiri aman dipanggil di sini.
  const { data: mySubmissions = [] } = useProjectSubmissions(active?.id)

  // Syarat Modul 6: hanya siswa yang sudah benar-benar mencapai C6 (Mencipta)
  // di salah satu topik bukti telah menyelesaikan seluruh tugas adaptif di
  // topik itu yang boleh mengumpulkan proyek.
  const c6Topics = [...new Set(myProfiles.filter((p) => p.current_level === 6).map((p) => p.topic))]
  const hasReachedC6 = c6Topics.length > 0

  // Hanya tawarkan topik yang sudah benar-benar C6; fallback ke semua topik
  // published kalau daftar soal di workspace belum sinkron dengan nama topik profil.
  const publishedTopics = [...new Set(questions.map((q) => q.topic).filter(Boolean))]
  const topics = c6Topics.length > 0 ? c6Topics : publishedTopics

  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef(null)

  const selectedTopic = topic || topics[0] || ''

  const handleFile = (f) => {
    if (!f) return
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Ukuran file melebihi ${MAX_SIZE_MB} MB.`)
      return
    }
    setFile(f)
    setErrorMsg('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !selectedTopic || !active?.id) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const filePath = await api.uploadProjectFile({ workspaceId: active.id, userId: user.id, file })
      await api.submitProject({
        workspaceId: active.id,
        userId: user.id,
        topic: selectedTopic,
        fileName: file.name,
        fileSize: file.size,
        filePath,
        description: description.trim(),
      })
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah.')
      setStatus('error')
    }
  }

  if (loadingProfiles) return null

  if (!hasReachedC6) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg text-muted">
          <Lock size={22} />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">Belum bisa mengumpulkan proyek</h2>
        <p className="mt-2 text-sm text-muted">
          Kumpulkan Proyek baru terbuka setelah kamu menyelesaikan semua tugas adaptif di suatu
          topik dan mencapai level tertinggi <strong>C6 Mencipta</strong>. Lanjutkan mengerjakan
          sesi di halaman Tugas untuk membuka fitur ini.
        </p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <CheckCircle2 size={40} className="mx-auto text-[color:var(--c3)]" />
        <h2 className="mt-4 text-lg font-extrabold">Laporan berhasil dikumpulkan</h2>
        <p className="mt-2 text-sm text-muted">
          Gurumu akan memeriksa laporan proyekmu tentang <strong>{selectedTopic}</strong>.
        </p>
        <button
          type="button"
          onClick={() => { setStatus('idle'); setFile(null); setDescription('') }}
          className="btn-ghost mt-6"
        >
          Kumpulkan laporan lain
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl">Kumpulkan Proyek Mini</h1>
        <p className="mt-1 text-sm text-muted">
          Unggah laporan proyekmu sebagai bukti penguasaan C6 Mencipta.
        </p>
      </header>

      {mySubmissions.length > 0 && (
        <Panel title="Riwayat pengumpulanmu" subtitle="Status tinjauan & nilai dari gurumu">
          <div className="space-y-2">
            {mySubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold">{sub.topic}</p>
                  <p className="text-xs text-muted">
                    {new Date(sub.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {sub.reviewed_at ? (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-[color:var(--c3)]/10 px-2.5 py-1 text-xs font-extrabold text-[color:var(--c3)]">
                    <Check size={11} /> Nilai: {sub.score ?? '—'}
                  </span>
                ) : (
                  <span className="text-xs text-muted">Menunggu tinjauan guru</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {/* Topik */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor="project-topic">
            Topik
          </label>
          {topics.length > 0 ? (
            <select
              id="project-topic"
              className="input w-full"
              value={selectedTopic}
              onChange={(e) => setTopic(e.target.value)}
              required
            >
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <input
              id="project-topic"
              className="input w-full"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Nama topik proyek"
              required
            />
          )}
        </div>

        {/* File upload */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            File laporan (PDF / Word, maks. {MAX_SIZE_MB} MB)
          </label>
          <div
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-accent bg-[color:var(--accent)]/5'
                : file
                ? 'border-[color:var(--c3)] bg-[color:var(--c3)]/5'
                : 'border-line hover:border-accent/50'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <>
                <FileText size={28} className="text-[color:var(--c3)]" />
                <div className="text-center">
                  <p className="text-sm font-bold">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </>
            ) : (
              <>
                <Upload size={28} className="text-muted" />
                <p className="text-center text-sm text-muted">
                  Seret file ke sini atau <span className="font-bold text-accent">klik untuk memilih</span>
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* Deskripsi singkat */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            Deskripsi singkat <span className="font-normal normal-case">(opsional)</span>
          </label>
          <textarea
            className="input w-full resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ringkas apa yang kamu rancang dan apa temuanmu…"
            maxLength={300}
          />
          <p className="mt-1 text-right text-[10px] text-muted">{description.length}/300</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md border border-[color:var(--c6)]/30 bg-[color:var(--c6)]/5 px-3 py-2.5 text-sm text-[color:var(--c6)]">
            <AlertCircle size={14} className="shrink-0" />
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || !selectedTopic || status === 'submitting'}
          className="btn-primary w-full disabled:opacity-40"
        >
          {status === 'submitting' ? (
            <><Loader2 size={15} className="animate-spin" /> Mengunggah…</>
          ) : (
            <><Upload size={15} /> Kumpulkan laporan</>
          )}
        </button>
      </form>
    </div>
  )
}
