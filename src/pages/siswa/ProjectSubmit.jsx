import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useQuestions } from '../../hooks/useClassData'
import * as api from '../../lib/api'

const MAX_SIZE_MB = 10
const ACCEPTED = '.pdf,.doc,.docx'

export default function ProjectSubmit() {
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: questions = [] } = useQuestions(active?.id, { publishedOnly: true })

  // Unique topics from published questions
  const topics = [...new Set(questions.map((q) => q.topic).filter(Boolean))]

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
      await api.submitProject({
        workspaceId: active.id,
        userId: user.id,
        topic: selectedTopic,
        fileName: file.name,
        fileSize: file.size,
        description: description.trim(),
      })
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah.')
      setStatus('error')
    }
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
          Unggah laporan proyekmu sebagai bukti penguasaan C6 — Mencipta.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {/* Topik */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            Topik
          </label>
          {topics.length > 0 ? (
            <select
              className="input w-full"
              value={selectedTopic}
              onChange={(e) => setTopic(e.target.value)}
              required
            >
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <input
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
