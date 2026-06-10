import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import { useSessions } from '../../hooks/useClassData'
import { BLOOM, BLOOM_LEVELS, codeOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import BloomLadder from '../../components/bloom/BloomLadder'
import BloomRadar from '../../components/charts/BloomRadar'
import TrajectoryChart from '../../components/charts/TrajectoryChart'

export default function StudentProfile() {
  const { user, profile } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)
  const { data: sessions = [] } = useSessions(active?.id, user?.id)

  const [selectedTopic, setSelectedTopic] = useState('')
  const topic = selectedTopic || myProfiles[0]?.topic || ''
  const p = myProfiles.find((x) => x.topic === topic)

  const trajectory = useMemo(
    () => sessions.filter((s) => s.topic === topic).map((s) => s.bloom_level || 1),
    [sessions, topic],
  )

  if (myProfiles.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg">Profil Bloom-mu masih kosong</h1>
        <p className="mt-2 text-sm text-muted">
          Selesaikan satu sesi adaptif dan peta kognitifmu akan muncul di sini.
        </p>
        <Link to="/siswa/beranda" className="btn-primary mt-5"><Play size={15} /> Mulai sesi pertama</Link>
      </div>
    )
  }

  const code = codeOf(p?.current_level || 1)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Profil Bloom — {profile?.full_name?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted">
            Posisimu sekarang: <span className="font-mono font-extrabold" style={{ color: BLOOM[code].color }}>{code} · {BLOOM[code].name}</span>
            {p && p.trend !== 0 && (
              <span className="ml-1.5">{p.trend > 0 ? '(sedang naik)' : '(butuh penguatan)'}</span>
            )}
          </p>
        </div>
        {myProfiles.length > 1 && (
          <select className="input !w-auto text-xs font-bold" value={topic} onChange={(e) => setSelectedTopic(e.target.value)}>
            {myProfiles.map((x) => <option key={x.topic} value={x.topic}>{x.topic}</option>)}
          </select>
        )}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Radar kognitif" subtitle={`Mastery per level · ${topic}`}>
          <BloomRadar profile={p} name={profile?.full_name} />
          <div className="mt-2 space-y-2">
            {BLOOM_LEVELS.map((c) => {
              const v = p?.[c.toLowerCase()] ?? 0
              return (
                <div key={c} className="flex items-center gap-3">
                  <span className="w-7 font-mono text-[11px] font-bold" style={{ color: BLOOM[c].color }}>{c}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-bg">
                    <div className="h-full rounded-pill transition-all duration-500" style={{ width: `${v}%`, background: BLOOM[c].color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] text-muted">{v}</span>
                </div>
              )
            })}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Tangga Bloom" subtitle="Posisimu dan target berikutnya">
            <BloomLadder currentLevel={p?.current_level || 1} />
          </Panel>
        </div>
      </div>

      <Panel title="Trajektori belajarmu" subtitle={`Level Bloom dari sesi ke sesi · ${topic}`}>
        <TrajectoryChart levels={trajectory} />
      </Panel>
    </div>
  )
}
