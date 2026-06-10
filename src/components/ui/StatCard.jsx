export default function StatCard({ label, value, sub, accent = 'var(--accent)', icon: Icon }) {
  return (
    <div className="card relative overflow-hidden p-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-muted" />}
      </div>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}
