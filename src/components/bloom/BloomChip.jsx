import { BLOOM } from '../../lib/bloom'
import BloomDot from './BloomDot'

// Dot + "C3 · Menerapkan"
export default function BloomChip({ code, className = '' }) {
  const b = BLOOM[code]
  if (!b) return null
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${className}`}>
      <BloomDot code={code} />
      <span className="font-mono">{b.code}</span>
      <span className="text-muted">·</span>
      <span>{b.name}</span>
    </span>
  )
}
