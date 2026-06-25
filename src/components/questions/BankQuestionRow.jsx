import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import BloomBadge from '../bloom/BloomBadge'
import QuestionCard from './QuestionCard'

// Baris ringkas satu soal dari bank yang sudah terpublikasi; klik untuk lihat detail lengkap.
export default function BankQuestionRow({ question: q }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold leading-snug">{q.prompt}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-pill border border-line px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
              {q.type === 'mcq' ? 'PG' : 'Esai'}
            </span>
            <span className="text-[10px] text-muted">{q.topic}</span>
            {(q.bloom_target || []).map((c) => <BloomBadge key={c} code={c} size="sm" soft />)}
          </div>
        </div>
        <ChevronDown size={14} className={`mt-0.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <QuestionCard question={q} />
        </div>
      )}
    </div>
  )
}
