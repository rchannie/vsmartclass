import { BLOOM } from '../../lib/bloom'

export default function BloomDot({ code, size = 8, className = '' }) {
  const b = BLOOM[code]
  if (!b) return null
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, background: b.color }}
    />
  )
}
