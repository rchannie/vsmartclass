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
              // tint 8% (bukan 14%) agar teks berwarna b.color di atasnya (baris di bawah) tetap >=4.5:1 — WCAG AA
              // (level "akan datang" dibedakan lewat border/background saja, bukan opacity — opacity rendah
              // membuat teks berwarna jatuh di bawah AA berapa pun nilainya yang masih terlihat "pudar")
              background: isCurrent ? softBg(code, 8) : reached ? softBg(code, 6) : 'var(--surface)',
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
