import { Sparkles } from 'lucide-react'

// Loading state AI: spinner + 3 baris shimmer skeleton (UX rule #5)
export default function AIThinking({ label = 'AI sedang berpikir…', sub }) {
  return (
    <div className="card fade-up p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
          <Sparkles size={16} className="animate-pulse" />
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-20" />
        </span>
        <div>
          <p className="text-sm font-extrabold">{label}</p>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="shimmer h-3.5 w-full rounded-pill" />
        <div className="shimmer h-3.5 w-4/5 rounded-pill" />
        <div className="shimmer h-3.5 w-3/5 rounded-pill" />
      </div>
    </div>
  )
}
