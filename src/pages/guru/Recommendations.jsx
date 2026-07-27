import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Rocket, FileText, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useClassBloomProfiles } from '../../hooks/useBloomProfile'
import { useProjectSubmissions } from '../../hooks/useClassData'
import { BLOOM, TEACHING_STRATEGIES, codeOf } from '../../lib/bloom'
import { pickClassStrategy } from '../../lib/recs'
import BloomBadge from '../../components/bloom/BloomBadge'
import Panel from '../../components/ui/Panel'

export default function TeacherRecommendations() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: profiles = [] } = useClassBloomProfiles(active?.id)
  const { data: submissions = [] } = useProjectSubmissions(active?.id)

  const recommended = pickClassStrategy(profiles)

  // distribusi siswa per level
  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0, 0]
    profiles.forEach((p) => { d[(p.current_level || 1) - 1] += 1 })
    return d
  }, [profiles])

  // Per-topik breakdown
  const topicBreakdown = useMemo(() => {
    const byTopic = new Map()
    profiles.forEach((p) => {
      if (!byTopic.has(p.topic)) byTopic.set(p.topic, [])
      byTopic.get(p.topic).push(p)
    })
    return [...byTopic.entries()].map(([topic, list]) => {
      const avgLevel = list.reduce((s, p) => s + (p.current_level || 1), 0) / list.length
      const subCount = submissions.filter((s) => s.topic === topic).length
      let badge = null
      if (avgLevel >= 5) badge = 'siap-c6'
      else if (avgLevel <= 2) badge = 'perlu-penguatan'
      return { topic, avgLevel, studentCount: list.length, subCount, badge }
    })
  }, [profiles, submissions])

  const workspaceSelector = workspaces.length > 0 && (
    <select className="input !w-auto text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
      {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rekomendasi Strategi Mengajar</h1>
          <p className="mt-1 text-sm text-muted">
            Dipetakan otomatis dari distribusi Bloom kelas — bukan resep kaku, melainkan titik mulai.
          </p>
        </div>
        {workspaceSelector}
      </header>

      {profiles.length > 0 && (
        <Panel title="Distribusi kelas saat ini" subtitle={`${profiles.length} profil siswa`}>
          <div className="flex flex-wrap gap-3">
            {dist.map((n, i) =>
              n > 0 ? (
                <span key={i} className="inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1.5 text-xs font-bold">
                  <BloomBadge code={codeOf(i + 1)} size="sm" />
                  {n} siswa
                </span>
              ) : null,
            )}
          </div>
        </Panel>
      )}

      {/* Per-topik breakdown */}
      {topicBreakdown.length > 0 && (
        <Panel title="Profil per topik" subtitle="Rata-rata level kelas dan laporan proyek masuk">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topicBreakdown.map(({ topic, avgLevel, studentCount, subCount, badge }) => (
              <div key={topic} className="rounded-lg border border-line bg-bg p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold leading-snug">{topic}</p>
                  {badge === 'siap-c6' && (
                    <span
                      className="shrink-0 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: BLOOM.C6.color }}
                    >
                      <Rocket size={9} /> Siap C6
                    </span>
                  )}
                  {badge === 'perlu-penguatan' && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-pill bg-[color:var(--c1)]/10 px-2 py-0.5 text-[10px] font-bold text-[color:var(--c2)]">
                      Perlu Penguatan
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} /> {studentCount} siswa
                  </span>
                  <span>·</span>
                  <span>Avg <BloomBadge code={codeOf(Math.round(avgLevel))} size="sm" /></span>
                </div>
                {/* Progress bar rata-rata level */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((avgLevel / 6) * 100)}%`,
                      background: BLOOM[codeOf(Math.round(avgLevel))].color,
                    }}
                  />
                </div>
                {/* Laporan proyek */}
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  <FileText size={11} className="text-muted" />
                  <span className="font-bold">{subCount}</span>
                  <span className="text-muted">laporan proyek masuk</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Laporan proyek lengkap sekarang punya menu sendiri: "Proyek Siswa" */}
      {submissions.length > 0 && (
        <Link
          to="/guru/proyek-siswa"
          className="card flex items-center justify-between gap-3 p-4 text-sm font-bold transition-colors hover:bg-bg"
        >
          <span className="inline-flex items-center gap-2">
            <FileText size={15} className="text-accent" />
            {submissions.length} laporan proyek siswa masuk — lihat &amp; unduh di menu Proyek Siswa
          </span>
          <ArrowRight size={15} className="text-muted" />
        </Link>
      )}

      {/* 4 strategi mengajar */}
      <div className="grid gap-4 md:grid-cols-2">
        {TEACHING_STRATEGIES.map((s) => {
          const isRec = s.id === recommended
          return (
            <article
              key={s.id}
              className={`card relative overflow-hidden p-5 transition-all ${isRec ? 'ring-2' : ''}`}
              style={{
                borderTop: `4px solid ${BLOOM[s.range[0]].color}`,
                ...(isRec ? { ringColor: 'var(--accent)', '--tw-ring-color': 'var(--accent)' } : {}),
              }}
            >
              {isRec && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-pill bg-accent px-2.5 py-1 text-[10px] font-bold text-white">
                  <BadgeCheck size={12} /> Cocok untuk kelasmu
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {s.range.map((c) => <BloomBadge key={c} code={c} size="sm" />)}
              </div>
              <h3 className="mt-2.5 text-base">{s.title}</h3>
              <p className="text-xs font-bold text-muted">{s.when}</p>
              <p className="mt-2 text-sm leading-relaxed">{s.desc}</p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {s.methods.map((m) => (
                  <span key={m} className="rounded-pill border border-line bg-bg px-2.5 py-1 text-[11px] font-bold text-muted">
                    {m}
                  </span>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
