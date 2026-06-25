import { useMemo, useState } from 'react'
import { Search, ChevronDown, Library } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useQuestions } from '../../hooks/useClassData'
import { BLOOM_LEVELS } from '../../lib/bloom'
import BloomBadge from '../../components/bloom/BloomBadge'
import BankQuestionRow from '../../components/questions/BankQuestionRow'
import Panel from '../../components/ui/Panel'

// Bank soal lengkap: seluruh tugas (topik) yang soalnya sudah digenerate AI
// dan dipublikasikan ke kelas — beda dengan panel di "Buat Soal" yang hanya
// menampilkan bank untuk topik yang sedang digarap saat itu.
export default function QuestionBank() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: questions = [] } = useQuestions(active?.id, { publishedOnly: true })
  const [search, setSearch] = useState('')

  const groups = useMemo(() => {
    const byTopic = new Map()
    questions.forEach((q) => {
      if (!byTopic.has(q.topic)) byTopic.set(q.topic, [])
      byTopic.get(q.topic).push(q)
    })
    return [...byTopic.entries()]
      .map(([topic, items]) => ({
        topic,
        subject: items[0]?.subject,
        items,
        latest: items.reduce((max, q) => (q.created_at > max ? q.created_at : max), items[0]?.created_at || ''),
        levels: [...new Set(items.flatMap((q) => q.bloom_target || []))]
          .sort((a, b) => BLOOM_LEVELS.indexOf(a) - BLOOM_LEVELS.indexOf(b)),
      }))
      .filter((g) => g.topic.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => (a.latest < b.latest ? 1 : -1))
  }, [questions, search])

  const workspaceSelector = workspaces.length > 0 && (
    <select className="input !w-auto text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
      {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Bank Soal</h1>
          <p className="mt-1 text-sm text-muted">
            Semua tugas yang soalnya sudah digenerate AI dan dipublikasikan ke kelas ini.
          </p>
        </div>
        {workspaceSelector}
      </header>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Cari topik…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-accent">
            <Library size={22} />
          </span>
          <h3 className="mt-3 text-base">Belum ada soal terpublikasi</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Buat soal lewat menu <span className="font-bold">Buat Soal</span>, lalu publikasikan ke kelas — tugasnya akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => <TopicGroup key={g.topic} group={g} />)}
        </div>
      )}
    </div>
  )
}

function TopicGroup({ group }) {
  const [open, setOpen] = useState(false)
  const { topic, subject, items, levels } = group

  return (
    <Panel>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-snug">{topic}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {subject && (
              <span className="rounded-pill border border-line px-2 py-0.5 text-[10px] font-bold text-muted">{subject}</span>
            )}
            <span className="text-xs text-muted">{items.length} soal</span>
            {levels.map((c) => <BloomBadge key={c} code={c} size="sm" soft />)}
          </div>
        </div>
        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {items.map((q) => <BankQuestionRow key={q.id} question={q} />)}
        </div>
      )}
    </Panel>
  )
}
