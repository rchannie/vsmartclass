// Pill segmented control — role switch, tipe soal, jenjang, dll.
export default function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-pill border border-line bg-bg p-1 ${className}`} role="tablist">
      {options.map((opt) => {
        const o = typeof opt === 'string' ? { value: opt, label: opt } : opt
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`rounded-pill px-3.5 py-1.5 text-xs font-bold transition-all ${
              active ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
