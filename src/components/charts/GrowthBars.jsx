import { BLOOM_LEVELS, BLOOM } from '../../lib/bloom'

// Growth stacked bars — X: Minggu 1..4, Y: stacked 100% distribusi bloom.
// weeks: [{ label, dist: { C1: n, ... C6: n } }]
export default function GrowthBars({ weeks = [], height = 190 }) {
  if (!weeks.length) {
    return <p className="py-6 text-center text-sm text-muted">Belum ada data pertumbuhan.</p>
  }
  return (
    <div className="flex items-end justify-around gap-4" style={{ height }}>
      {weeks.map((w) => {
        const total = BLOOM_LEVELS.reduce((s, c) => s + (w.dist[c] || 0), 0) || 1
        return (
          <div key={w.label} className="flex h-full w-full max-w-[72px] flex-col items-center gap-2">
            <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-md border border-line">
              {BLOOM_LEVELS.map((code) => {
                const pct = ((w.dist[code] || 0) / total) * 100
                if (pct === 0) return null
                return (
                  <div
                    key={code}
                    className="w-full transition-all duration-300"
                    style={{ height: `${pct}%`, background: BLOOM[code].color }}
                    title={`${w.label} — ${code}: ${Math.round(pct)}%`}
                  />
                )
              })}
            </div>
            <span className="text-[11px] font-bold text-muted">{w.label}</span>
          </div>
        )
      })}
    </div>
  )
}
