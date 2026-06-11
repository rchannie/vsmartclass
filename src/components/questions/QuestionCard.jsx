import { BLOOM, softBg, difficultyTierOf, DIFFICULTY_TIERS } from '../../lib/bloom'
import BloomBadge from '../bloom/BloomBadge'

// Kartu soal (tampilan guru): PG dengan opsi berlabel Bloom, atau Esai dengan rubrik.
// Setiap opsi: border-left warna bloom, badge, indikator kognitif, feedback formatif.
export default function QuestionCard({ question, index, action }) {
  return (
    <article className="card fade-up overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-start gap-3">
          {typeof index === 'number' && (
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-bold text-white">
              {index + 1}
            </span>
          )}
          <div>
            <p className="text-sm font-extrabold leading-snug">{question.prompt}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                {question.type === 'mcq' ? 'Pilihan Ganda' : 'Esai'}
              </span>
              {(question.bloom_target || []).map((c) => (
                <BloomBadge key={c} code={c} size="sm" soft />
              ))}
              {(() => {
                const tier = difficultyTierOf(question.bloom_target || [])
                const t = DIFFICULTY_TIERS[tier]
                return (
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${t.className}`}>
                    {t.label}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <div className="space-y-2.5 p-5">
        {question.type === 'mcq' ? (
          (question.options || []).map((opt) => (
            <div
              key={opt.id}
              className="rounded-md border border-line p-3.5"
              style={{ borderLeft: `4px solid ${BLOOM[opt.bloom]?.color || 'var(--border)'}` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-muted">{opt.id}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <BloomBadge code={opt.bloom} size="sm" />
                    <p className="text-sm font-bold leading-snug">{opt.text}</p>
                  </div>
                  {opt.indicator && (
                    <p className="mt-1.5 text-xs text-muted">
                      <span className="font-bold">Indikator kognitif:</span> {opt.indicator}
                    </p>
                  )}
                  {opt.feedback && (
                    <p
                      className="mt-2 rounded-sm px-2.5 py-1.5 text-xs leading-relaxed"
                      style={{ background: softBg(opt.bloom, 10), color: 'var(--text)' }}
                    >
                      {opt.feedback}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Rubrik penilaian</p>
            {(question.rubric || []).map((r) => (
              <div
                key={r.bloom}
                className="flex items-start gap-2.5 rounded-md border border-line p-3"
                style={{ borderLeft: `4px solid ${BLOOM[r.bloom]?.color || 'var(--border)'}` }}
              >
                <BloomBadge code={r.bloom} size="sm" />
                <p className="text-xs leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
