import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Rocket, Play } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import { BLOOM, softBg } from '../../lib/bloom'
import { buildStudentRecs } from '../../lib/recs'
import BloomBadge from '../../components/bloom/BloomBadge'

export default function StudentRecs() {
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)

  const [selectedTopic, setSelectedTopic] = useState('')
  const topic = selectedTopic || myProfiles[0]?.topic || ''
  const p = myProfiles.find((x) => x.topic === topic)
  const { weakest, recs } = buildStudentRecs(p)

  if (!p) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg">Belum ada rekomendasi</h1>
        <p className="mt-2 text-sm text-muted">Selesaikan satu sesi dulu agar AI mengenal caramu berpikir.</p>
        <Link to="/siswa/beranda" className="btn-primary mt-5"><Play size={15} /> Mulai sesi</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rekomendasi untukmu</h1>
          <p className="mt-1 text-sm text-muted">
            Disusun dari profil Bloom-mu — area yang paling butuh perhatian:{' '}
            <span className="font-mono font-extrabold" style={{ color: BLOOM[weakest].color }}>
              {weakest} · {BLOOM[weakest].name}
            </span>
          </p>
        </div>
        {myProfiles.length > 1 && (
          <select className="input !w-auto text-xs font-bold" value={topic} onChange={(e) => setSelectedTopic(e.target.value)}>
            {myProfiles.map((x) => <option key={x.topic} value={x.topic}>{x.topic}</option>)}
          </select>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {recs.map((rec, i) => (
          <article key={i} className="card flex flex-col p-5" style={{ borderTop: `4px solid ${BLOOM[rec.bloom].color}` }}>
            <div className="flex items-center justify-between">
              <BloomBadge code={rec.bloom} size="md" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{rec.kind}</span>
            </div>
            <h3 className="mt-3 text-[15px] leading-snug">{rec.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{rec.why}</p>
            <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
              <span className="rounded-pill border border-line bg-bg px-2.5 py-1 text-muted">{rec.type}</span>
              <span className="inline-flex items-center gap-1 text-muted"><Clock size={12} /> ±{rec.minutes} menit</span>
            </div>
          </article>
        ))}
      </div>

      {/* CTA C6 — Tantangan Mencipta */}
      <div
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
        style={{ background: softBg('C6', 8), borderColor: BLOOM.C6.color }}
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-md text-white" style={{ background: BLOOM.C6.color }}>
            <Rocket size={20} />
          </span>
          <div>
            <h3 className="text-base">Tantangan Mencipta</h3>
            <p className="text-sm text-muted">
              Rancang satu soal {topic} versimu sendiri dan tantang teman sekelasmu menjawabnya.
            </p>
          </div>
        </div>
        <Link
          to={`/siswa/sesi/${encodeURIComponent(topic)}`}
          className="btn rounded-pill px-5 py-2.5 text-white"
          style={{ background: BLOOM.C6.color }}
        >
          Terima tantangan
        </Link>
      </div>
    </div>
  )
}
