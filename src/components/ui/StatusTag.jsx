import { softBg } from '../../lib/bloom'

// Status chip roster kelas: on-track (c3) / plateau (c4) / perlu perhatian (c6)
const STATUS = {
  'on-track': { label: 'On-track', code: 'C3' },
  plateau: { label: 'Plateau', code: 'C4' },
  attention: { label: 'Perlu perhatian', code: 'C6' },
}

export default function StatusTag({ status }) {
  const s = STATUS[status] || STATUS.attention
  return (
    <span
      className="inline-flex items-center rounded-pill px-2.5 py-1 text-[11px] font-bold"
      style={{ background: softBg(s.code, 16), color: `var(--${s.code.toLowerCase()})` }}
    >
      {s.label}
    </span>
  )
}
