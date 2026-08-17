import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Play, RotateCcw, CheckCircle2, ClipboardList, Target, Flame, BookOpen, KeyRound, Plus } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { usePublicQuestions, useSessions } from '../../hooks/useClassData'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import * as api from '../../lib/api'
import { BLOOM, codeOf } from '../../lib/bloom'
import BloomBadge from '../../components/bloom/BloomBadge'
import Panel from '../../components/ui/Panel'

function statusOf(profile) {
  if (!profile || profile.session_count === 0) return 'belum'
  if (profile.current_level >= 6) return 'selesai'
  return 'progres'
}

const STATUS = {
  belum:   { label: 'Belum Dimulai',    className: 'border border-dashed border-line text-muted' },
  progres: { label: 'Sedang Dikerjakan', className: 'bg-[color:var(--c3)]/10 text-[color:var(--c3)]' },
  selesai: { label: 'Selesai',           className: 'bg-[color:var(--c6)]/10 text-[color:var(--c6)]' },
}

export default function StudentTasks() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: questions = [] } = usePublicQuestions(active?.id)
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)
  const { data: sessions = [] } = useSessions(active?.id, user?.id)
  const [showJoinForm, setShowJoinForm] = useState(false)

  // Temukan topik yang paling baru dikerjakan
  const lastActiveTopic = useMemo(() => {
    if (sessions.length === 0) return null
    const sorted = [...sessions].sort((a, b) => {
      const timeA = new Date(a.completed_at || a.started_at).getTime()
      const timeB = new Date(b.completed_at || b.started_at).getTime()
      return timeB - timeA
    })
    return sorted[0]?.topic || null
  }, [sessions])

  // Gabungkan topik dari soal yang diterbitkan guru + riwayat profil Bloom siswa di workspace aktif
  const tasks = useMemo(() => {
    const topicSet = new Set()
    questions.forEach((q) => q.topic && topicSet.add(q.topic))
    myProfiles.forEach((p) => p.topic && topicSet.add(p.topic))

    return [...topicSet].map((topic) => {
      const qs = questions.filter((q) => q.topic === topic)
      const profile = myProfiles.find((p) => p.topic === topic) ?? null
      return {
        topic,
        questionCount: qs.length,
        profile,
        isLastActive: topic === lastActiveTopic,
      }
    })
  }, [questions, myProfiles, lastActiveTopic])

  const counts = useMemo(() => ({
    belum:   tasks.filter((t) => statusOf(t.profile) === 'belum').length,
    progres: tasks.filter((t) => statusOf(t.profile) === 'progres').length,
    selesai: tasks.filter((t) => statusOf(t.profile) === 'selesai').length,
  }), [tasks])

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Tugas Aktif</h1>
          <p className="mt-1 text-sm text-muted">
            Daftar tugas dan latihan adaptif dari gurumu di kelas ini.
          </p>
        </div>
        {workspaces.length > 0 && (
          <button
            type="button"
            className="btn-ghost !px-3 !py-1.5 text-xs font-bold"
            onClick={() => setShowJoinForm((prev) => !prev)}
          >
            <Plus size={14} /> {showJoinForm ? 'Tutup Form' : 'Gabung Kelas Lain'}
          </button>
        )}
      </header>

      {workspaces.length === 0 ? (
        <JoinCard />
      ) : (
        <>
          {showJoinForm && <JoinCard compact />}

          {/* Card Info Kelas Aktif */}
          {active && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-line p-3.5 bg-line/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white shrink-0">
                  <BookOpen size={18} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">{active.name}</p>
                  <p className="text-xs text-muted">
                    {[active.school, active.subject].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {workspaces.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted hidden sm:inline font-bold">Pilih Kelas:</span>
                  <select
                    aria-label="Pilih kelas"
                    className="input !w-auto !py-1.5 text-xs font-bold"
                    value={active?.id || ''}
                    onChange={(e) => setActive(e.target.value)}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {tasks.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'belum',   label: 'Belum Dimulai',    color: 'var(--muted)' },
                { key: 'progres', label: 'Sedang Dikerjakan', color: 'var(--c3)' },
                { key: 'selesai', label: 'Selesai',           color: 'var(--c6)' },
              ].map(({ key, label, color }) => (
                <div key={key} className="card p-4 text-center">
                  <p className="text-2xl font-extrabold" style={{ color }}>{counts[key]}</p>
                  <p className="mt-1 text-[11px] font-bold text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}

          <Panel
            title="Daftar Tugas Kelas"
            subtitle={
              active
                ? `${active.name} · ${tasks.length} tugas tersedia`
                : 'Pilih kelas'
            }
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <ClipboardList size={32} className="text-muted" />
                <p className="mt-3 text-sm font-bold">Belum ada tugas</p>
                <p className="mt-1 text-xs text-muted">
                  {active
                    ? `Gurumu di kelas ${active.name} belum menerbitkan soal.`
                    : 'Gurumu belum menerbitkan soal di kelas ini.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {tasks.map(({ topic, questionCount, profile, isLastActive }) => {
                  const status = statusOf(profile)
                  const code = profile ? codeOf(profile.current_level) : null
                  const s = STATUS[status]
                  return (
                    <div key={topic} className={`flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 ${isLastActive ? 'bg-accent/5 -mx-4 px-4 rounded' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-extrabold">{topic}</p>
                          {isLastActive && (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                              <Flame size={9} /> Sedang Dikerjakan
                            </span>
                          )}
                          {!isLastActive && (
                            <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${s.className}`}>
                              {s.label}
                            </span>
                          )}
                          {status === 'belum' && (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-[color:var(--c3)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--c3)]">
                              <Target size={9} /> Kalibrasi Awal
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{questionCount > 0 ? `${questionCount} soal tersedia` : 'Tugas adaptif'}</span>
                          {status === 'belum' && <span>· Sesi pertama mulai dari C3 untuk kalibrasi</span>}
                          {profile && profile.session_count > 0 && (
                            <>
                              <span>·</span>
                              {code && <BloomBadge code={code} size="sm" />}
                              {code && <span>{BLOOM[code].name}</span>}
                              <span>·</span>
                              <span>{profile.session_count} sesi selesai</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/siswa/sesi/${encodeURIComponent(topic)}`}
                        className={`shrink-0 !px-4 !py-2 text-xs ${status === 'selesai' ? 'btn-ghost' : 'btn-primary'}`}
                      >
                        {status === 'belum'   && <><Play size={13} /> Mulai</>}
                        {status === 'progres' && <><RotateCcw size={13} /> Lanjutkan</>}
                        {status === 'selesai' && <><CheckCircle2 size={13} /> Ulangi</>}
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}

function JoinCard({ compact = false }) {
  const { user } = useAuth()
  const { setActive } = useActiveWorkspace(user?.id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const join = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const w = await api.joinWorkspace(code, user)
      await qc.invalidateQueries({ queryKey: ['workspaces'] })
      setActive(w.id)
      setCode('')
      navigate('/siswa/tugas')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={compact ? 'Gabung kelas lain' : 'Gabung kelas pertamamu'}
      subtitle="Masukkan kode unik dari gurumu (contoh: VSC-7QK2)"
    >
      <form onSubmit={join} className="flex gap-2">
        <input
          className="input flex-1 font-mono uppercase"
          placeholder="VSC-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0">
          <KeyRound size={15} /> {busy ? '…' : 'Gabung'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs font-bold text-c6">{error}</p>}
    </Panel>
  )
}

