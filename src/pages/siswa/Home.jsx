import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Play, KeyRound, BookOpen, ArrowRight, ClipboardList, RotateCcw } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useQuestions } from '../../hooks/useClassData'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import * as api from '../../lib/api'
import { BLOOM, codeOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import BloomBadge from '../../components/bloom/BloomBadge'
import BloomLadder from '../../components/bloom/BloomLadder'

export default function StudentHome() {
  const { user, profile } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: questions = [] } = useQuestions(active?.id, { publishedOnly: true })
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)

  // Topik = gabungan topik soal terbit + topik yang pernah dikerjakan
  const topics = useMemo(() => {
    const set = new Set()
    questions.forEach((q) => q.topic && set.add(q.topic))
    myProfiles.forEach((p) => p.topic && set.add(p.topic))
    return [...set]
  }, [questions, myProfiles])

  const profileOf = (topic) => myProfiles.find((p) => p.topic === topic)
  const bestProfile = myProfiles.reduce((a, b) => ((b?.current_level || 0) > (a?.current_level || 0) ? b : a), myProfiles[0])

  // Hitung ringkasan status tugas untuk ditampilkan di beranda
  const taskSummary = useMemo(() => {
    const belum   = topics.filter((t) => { const p = profileOf(t); return !p || p.session_count === 0 }).length
    const progres = topics.filter((t) => { const p = profileOf(t); return p && p.session_count > 0 && p.current_level < 6 }).length
    const selesai = topics.filter((t) => { const p = profileOf(t); return p && p.current_level >= 6 }).length
    return { belum, progres, selesai }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, myProfiles])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Halo, {profile?.full_name?.split(' ')[0] || 'Siswa'}</h1>
        <p className="mt-1 text-sm text-muted">Setiap jawaban menunjukkan caramu berpikir — tidak ada jawaban salah di sini.</p>
      </header>

      {workspaces.length === 0 ? (
        <JoinCard />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Panel
              title="Kelasmu"
              subtitle="Workspace yang kamu ikuti"
              action={
                workspaces.length > 1 && (
                  <select className="input !w-auto !py-1.5 text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
                    {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )
              }
            >
              {active && (
                <div className="flex items-center gap-3 rounded-md border border-line p-3.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white">
                    <BookOpen size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">{active.name}</p>
                    <p className="text-xs text-muted">{[active.school, active.subject].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              )}
            </Panel>

            <Panel
              title="Tugas Aktif"
              subtitle="Soal yang diterbitkan gurumu"
              action={
                topics.length > 0 && (
                  <Link to="/siswa/tugas" className="btn-ghost !px-2 !py-1 text-xs">
                    Lihat semua <ArrowRight size={13} />
                  </Link>
                )
              }
            >
              {topics.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <ClipboardList size={28} className="text-muted" />
                  <p className="mt-2 text-sm font-bold">Belum ada tugas</p>
                  <p className="mt-1 text-xs text-muted">Tunggu gurumu menerbitkan soal.</p>
                </div>
              ) : (
                <>
                  {/* Ringkasan status */}
                  <div className="mb-4 flex gap-3">
                    {[
                      { label: 'Belum', value: taskSummary.belum,   color: 'var(--muted)' },
                      { label: 'Progres', value: taskSummary.progres, color: 'var(--c3)' },
                      { label: 'Selesai', value: taskSummary.selesai, color: 'var(--c6)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex-1 rounded-md border border-line p-3 text-center">
                        <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
                        <p className="text-[10px] font-bold text-muted">{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* 3 tugas teratas */}
                  <div className="space-y-2">
                    {topics.slice(0, 3).map((topic) => {
                      const p = profileOf(topic)
                      const code = codeOf(p?.current_level || 1)
                      const isDone = p && p.session_count > 0
                      return (
                        <div key={topic} className="flex items-center justify-between gap-3 rounded-md border border-line p-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold">{topic}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                              {isDone ? (
                                <>
                                  <BloomBadge code={code} size="sm" />
                                  <span>{BLOOM[code].name}</span>
                                  <span>·</span>
                                  <span>{p.session_count} sesi</span>
                                </>
                              ) : (
                                <span>Belum dimulai — mulai dari C2</span>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/siswa/sesi/${encodeURIComponent(topic)}`}
                            className="btn-primary !px-3 !py-1.5 text-xs shrink-0"
                          >
                            {isDone ? <><RotateCcw size={12} /> Lanjut</> : <><Play size={12} /> Mulai</>}
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                  {topics.length > 3 && (
                    <Link to="/siswa/tugas" className="mt-3 block text-center text-xs font-bold text-accent hover:underline">
                      +{topics.length - 3} tugas lainnya
                    </Link>
                  )}
                </>
              )}
            </Panel>

            <JoinCard compact />
          </div>

          <Panel
            title="Tangga Bloom-mu"
            subtitle={bestProfile ? `Topik: ${bestProfile.topic}` : 'Selesaikan sesi pertamamu'}
            action={
              <Link to="/siswa/profil" className="btn-ghost !px-2 !py-1 text-xs">
                Profil <ArrowRight size={13} />
              </Link>
            }
          >
            <BloomLadder currentLevel={bestProfile?.current_level || 1} />
          </Panel>
        </div>
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
      navigate('/siswa/beranda')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={compact ? 'Gabung kelas lain' : 'Gabung kelas pertamamu'}
      subtitle="Masukkan kode dari gurumu (cth. VSC-7QK2)"
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
