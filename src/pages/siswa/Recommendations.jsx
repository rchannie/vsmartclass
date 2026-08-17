 import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, Rocket, Play, ExternalLink, HelpCircle, Loader2, History, ArrowRight } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import { BLOOM, codeOf, softBg } from '../../lib/bloom'
import { findSpacedReviewTopics } from '../../lib/recs'
import * as api from '../../lib/api'
import BloomBadge from '../../components/bloom/BloomBadge'
import VarkSurvey, { VARK_META } from '../../components/bloom/VarkSurvey'

export default function StudentRecs() {
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)

  const [selectedTopic, setSelectedTopic] = useState('')
  const topic = selectedTopic || myProfiles[0]?.topic || ''
  const p = myProfiles.find((x) => x.topic === topic)

  // VARK state
  const [varkStyle, setVarkStyle] = useState(null)
  const [varkLoaded, setVarkLoaded] = useState(false)

  // Load VARK style on mount
  useEffect(() => {
    if (!user?.id) return
    api.getVarkStyle(user.id).then((style) => {
      setVarkStyle(style)
      setVarkLoaded(true)
    })
  }, [user?.id])

  // Rekomendasi AI — di-fetch ulang saat profil/topik/gaya belajar berubah
  const { data: recsData, isFetching: recsLoading } = useQuery({
    queryKey: ['student-recs', user?.id, active?.id, topic, varkStyle, p?.updated_at],
    queryFn: () => api.getStudentRecs(user.id, active.id, topic, varkStyle),
    enabled: Boolean(p && varkLoaded && active?.id),
  })
  const aiRecs = recsData?.studentRecs ?? null
  const weakest = recsData?.weakest ?? null

  const handleVarkComplete = async (style) => {
    await api.saveVarkStyle(user.id, style)
    setVarkStyle(style)
  }

  if (!p) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg">Belum ada rekomendasi</h1>
        <p className="mt-2 text-sm text-muted">Selesaikan satu sesi dulu agar AI mengenal caramu berpikir.</p>
        <Link to="/siswa/beranda" className="btn-primary mt-5"><Play size={15} /> Mulai sesi</Link>
      </div>
    )
  }

  const displayWeakest = weakest || 'C1'
  const varkMeta = varkStyle ? VARK_META[varkStyle] : null
  const spacedReview = findSpacedReviewTopics(myProfiles)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rekomendasi untukmu</h1>
          <p className="mt-1 text-sm text-muted">
            Disusun dari profil Bloom-mu — area yang paling butuh perhatian:{' '}
            <span className="font-mono font-extrabold" style={{ color: BLOOM[displayWeakest].color }}>
              {displayWeakest} · {BLOOM[displayWeakest].name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {varkMeta && (
            <span
              className="inline-flex items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-xs font-bold"
              style={{ color: varkMeta.color }}
            >
              <varkMeta.icon size={12} /> {varkMeta.label}
            </span>
          )}
          {myProfiles.length > 1 && (
            <select aria-label="Pilih topik" className="input !w-auto text-xs font-bold" value={topic} onChange={(e) => setSelectedTopic(e.target.value)}>
              {myProfiles.map((x) => <option key={x.topic} value={x.topic}>{x.topic}</option>)}
            </select>
          )}
        </div>
      </header>

      {/* Spaced review — topik yang belum tuntas & belum disentuh sekian hari */}
      {spacedReview.length > 0 && (
        <div className="card space-y-2.5 p-5" style={{ borderColor: 'var(--c4)' }}>
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: BLOOM.C4.color }} />
            <h3 className="text-sm font-extrabold">Waktunya review</h3>
          </div>
          <p className="text-xs text-muted">
            Topik ini belum kamu sentuh beberapa hari dan levelnya belum tuntas — jaga supaya tidak luntur.
          </p>
          <div className="flex flex-wrap gap-2">
            {spacedReview.map((p) => (
              <Link
                key={p.topic}
                to={`/siswa/sesi/${encodeURIComponent(p.topic)}`}
                className="inline-flex items-center gap-2 rounded-pill border border-line bg-bg px-3 py-1.5 text-xs font-bold hover:border-accent"
              >
                <BloomBadge code={codeOf(p.current_level)} size="sm" />
                {p.topic}
                <span className="text-muted">· {p.daysSince} hari lalu</span>
                <ArrowRight size={11} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* VARK survey — tampil jika belum ada gaya belajar tersimpan */}
      {varkLoaded && !varkStyle && (
        <VarkSurvey onComplete={handleVarkComplete} />
      )}

      {/* Rec cards */}
      {recsLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" />
          AI sedang menyusun rekomendasimu…
        </div>
      ) : aiRecs && (
        <div className="grid gap-4 md:grid-cols-3">
          {aiRecs.map((rec, i) => (
            <RecCard key={i} rec={rec} />
          ))}
        </div>
      )}

      {/* CTA C6 — Tantangan Mencipta */}
      <div
        className="card flex flex-wrap items-center justify-between gap-4 p-6"
        // tint 6% (bukan 8%) agar teks .text-muted di dalam kartu ini tetap >=4.5:1 — WCAG AA
        style={{ background: softBg('C6', 6), borderColor: BLOOM.C6.color }}
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-md text-white" style={{ background: BLOOM.C6.color }}>
            <Rocket size={20} />
          </span>
          <div>
            <h3 className="text-base">Tantangan Mencipta</h3>
            <p className="text-sm text-muted">
              Kumpulkan laporan proyek mini tentang {topic} dan buktikan penguasaan tertinggimu.
            </p>
          </div>
        </div>
        <Link
          to={`/siswa/proyek`}
          className="btn rounded-pill px-5 py-2.5 text-white"
          style={{ background: BLOOM.C6.color }}
        >
          Kumpulkan proyek
        </Link>
      </div>
    </div>
  )
}

function RecCard({ rec }) {
  return (
    <article className="card flex flex-col p-5" style={{ borderTop: `4px solid ${BLOOM[rec.bloom]?.color || 'var(--accent)'}` }}>
      <div className="flex items-center justify-between">
        <BloomBadge code={rec.bloom} size="md" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{rec.kind}</span>
      </div>
      <h3 className="mt-3 text-[15px] leading-snug">{rec.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{rec.why}</p>

      {/* Challenge question */}
      {rec.challengeQuestion && (
        <div className="mt-3 rounded-md border border-line bg-bg p-3">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
            <HelpCircle size={10} /> Tantangan
          </p>
          <p className="text-xs leading-relaxed">{rec.challengeQuestion}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-bold">
        <div className="flex items-center gap-1.5">
          <span className="rounded-pill border border-line bg-bg px-2.5 py-1 text-muted">{rec.type}</span>
          <span className="inline-flex items-center gap-1 text-muted"><Clock size={12} /> ±{rec.minutes} mnt</span>
        </div>
        {rec.resourceUrl && (
          <a
            href={rec.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline"
          >
            <ExternalLink size={11} /> {rec.resourceLabel || 'Sumber'}
          </a>
        )}
      </div>
    </article>
  )
}
