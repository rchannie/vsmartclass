import { BLOOM, softBg } from '../../lib/bloom'

// Pill "C3" berwarna bloom. soft = latar lembut + teks berwarna.
const SIZES = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
  lg: 'px-2.5 py-1 text-xs',
}

export default function BloomBadge({ code, size = 'md', soft = false, withName = false, className = '' }) {
  const b = BLOOM[code]
  if (!b) return null
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill font-mono font-bold leading-none ${SIZES[size]} ${className}`}
      style={soft ? { background: softBg(code, 16), color: b.color } : { background: b.color, color: '#fff' }}
      title={`${b.code} · ${b.name}`}
    >
      {b.code}
      {withName && <span className="font-sans">{b.name}</span>}
    </span>
  )
}
