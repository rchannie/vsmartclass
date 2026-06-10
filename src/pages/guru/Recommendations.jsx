import { useMemo } from 'react'
import { BadgeCheck } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useClassBloomProfiles } from '../../hooks/useBloomProfile'
import { BLOOM, TEACHING_STRATEGIES, codeOf } from '../../lib/bloom'
import { pickClassStrategy } from '../../lib/recs'
import BloomBadge from '../../components/bloom/BloomBadge'
import Panel from '../../components/ui/Panel'

export default function TeacherRecommendations() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: profiles = [] } = useClassBloomProfiles(active?.id)

  const recommended = pickClassStrategy(profiles)

  // distribusi siswa per level (untuk konteks di header)
  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0, 0]
    profiles.forEach((p) => { d[(p.current_level || 1) - 1] += 1 })
    return d
  }, [profiles])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rekomendasi Strategi Mengajar</h1>
          <p className="mt-1 text-sm text-muted">
            Dipetakan otomatis dari distribusi Bloom kelas — bukan resep kaku, melainkan titik mulai.
          </p>
        </div>
        {workspaces.length > 0 && (
          <select className="input !w-auto text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
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
