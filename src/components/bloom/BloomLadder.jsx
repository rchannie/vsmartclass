import { BLOOM_LEVELS, BLOOM, softBg } from '../../lib/bloom'

// Tangga Bloom vertikal C6..C1 — highlight level saat ini, dashed = target berikutnya
export default function BloomLadder({ currentLevel = 1, className = '' }) {
  const targetLevel = Math.min(6, currentLevel + 1)
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {[...BLOOM_LEVELS].reverse().map((code) => {
        const b = BLOOM[code]
        const isCurrent = b.level === currentLevel
        const isTarget = b.level === targetLevel && targetLevel !== currentLevel
        const reached = b.level < currentLevel
        return (
          <div
            key={code}
            className="flex items-center gap-2.5 rounded-md border px-3 py-2 transition-all"
            style={{
              borderColor: isCurrent ? b.color : isTarget ? b.color : 'var(--border)',
              borderStyle: isTarget ? 'dashed' : 'solid',
              borderWidth: isCurrent ? 2 : 1,
              background: isCurrent ? softBg(code, 14) : reached ? softBg(code, 6) : 'var(--surface)',
              opacity: !isCurrent && !isTarget && !reached ? 0.55 : 1,
            }}
          >
            <span
              className="font-mono text-[11px] font-bold leading-none"
              style={{ color: b.color }}
            >
              {code}
            </span>
            <span className={`text-xs ${isCurrent ? 'font-extrabold' : 'font-semibold'}`}>{b.name}</span>
            {isCurrent && (
              <span className="ml-auto rounded-pill px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: b.color }}>
                Posisimu
              </span>
            )}
            {isTarget && (
              <span className="ml-auto text-[10px] font-bold" style={{ color: b.color }}>
                Target berikutnya
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
