import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, RotateCcw, CheckCircle2, ClipboardList, Target } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { usePublicQuestions } from '../../hooks/useClassData'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
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

  const tasks = useMemo(() => {
    const map = new Map()
    questions.forEach((q) => {
      if (!q.topic) return
      if (!map.has(q.topic)) map.set(q.topic, [])
      map.get(q.topic).push(q)
    })
    return [...map.entries()].map(([topic, qs]) => ({
      topic,
      questionCount: qs.length,
      profile: myProfiles.find((p) => p.topic === topic) ?? null,
    }))
  }, [questions, myProfiles])

  const counts = useMemo(() => ({
    belum:   tasks.filter((t) => statusOf(t.profile) === 'belum').length,
    progres: tasks.filter((t) => statusOf(t.profile) === 'progres').length,
    selesai: tasks.filter((t) => statusOf(t.profile) === 'selesai').length,
  }), [tasks])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Tugas Aktif</h1>
        <p className="mt-1 text-sm text-muted">
          Soal yang diterbitkan gurumu setiap sesi menyesuaikan level berpikirmu secara otomatis.
        </p>
      </header>

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
        title="Daftar Tugas"
        subtitle={
          active
            ? `${active.name} · ${tasks.length} topik tersedia`
            : 'Pilih kelas'
        }
        action={
          workspaces.length > 1 && (
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
          )
        }
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <ClipboardList size={32} className="text-muted" />
            <p className="mt-3 text-sm font-bold">Belum ada tugas</p>
            <p className="mt-1 text-xs text-muted">Gurumu belum menerbitkan soal di kelas ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {tasks.map(({ topic, questionCount, profile }) => {
              const status = statusOf(profile)
              const code = profile ? codeOf(profile.current_level) : null
              const s = STATUS[status]
              return (
                <div key={topic} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold">{topic}</p>
                      <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${s.className}`}>
                        {s.label}
                      </span>
                      {status === 'belum' && (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-[color:var(--c3)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--c3)]">
                          <Target size={9} /> Kalibrasi Awal
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{questionCount} soal tersedia</span>
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
    </div>
  )
}
