import { BLOOM_LEVELS, BLOOM } from '../../lib/bloom'
import BloomDot from './BloomDot'

// Baris C1–C6 dengan dot + label
export default function BloomLegend({ compact = false, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {BLOOM_LEVELS.map((code) => (
        <span key={code} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <BloomDot code={code} size={7} />
          <span className="font-mono font-bold" style={{ color: BLOOM[code].color }}>{code}</span>
          {!compact && <span>{BLOOM[code].name}</span>}
        </span>
      ))}
    </div>
  )
}
