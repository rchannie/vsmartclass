import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Check, UserMinus, FileQuestion } from 'lucide-react'
import { useWorkspace, useMembers, useQuestions } from '../../hooks/useClassData'
import { useClassBloomProfiles } from '../../hooks/useBloomProfile'
import * as api from '../../lib/api'
import { codeOf, statusOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import Avatar from '../../components/ui/Avatar'
import StatusTag from '../../components/ui/StatusTag'
import BloomChip from '../../components/bloom/BloomChip'
import BloomBadge from '../../components/bloom/BloomBadge'
import { TrendIcon } from './Dashboard'

export default function WorkspaceDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: ws } = useWorkspace(id)
  const { data: members = [] } = useMembers(id)
  const { data: profiles = [] } = useClassBloomProfiles(id)
  const { data: questions = [] } = useQuestions(id)
  const [copied, setCopied] = useState(false)

  const students = members.filter((m) => m.role === 'siswa')
  const profileOf = (uid) => profiles.find((p) => p.user_id === uid)

  const copy = async () => {
    await navigator.clipboard.writeText(ws.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const remove = async (userId, name) => {
    if (!confirm(`Keluarkan ${name} dari kelas ini?`)) return
    await api.removeMember(id, userId)
    qc.invalidateQueries({ queryKey: ['members', id] })
  }

  if (!ws) return <p className="text-sm text-muted">Memuat kelas…</p>

  return (
    <div className="space-y-5">
      <Link to="/guru/dashboard" className="btn-ghost !px-2 text-xs"><ArrowLeft size={14} /> Dashboard</Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{ws.name}</h1>
          <p className="mt-1 text-sm text-muted">{[ws.school, ws.subject].filter(Boolean).join(' · ')}</p>
        </div>
        <button
          type="button" onClick={copy}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 font-mono text-sm font-bold text-accent hover:border-accent"
        >
          {ws.join_code}
          {copied ? <Check size={14} className="text-c3" /> : <Copy size={14} />}
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={`Anggota (${students.length} siswa)`}
          subtitle="Bloom level terkini tiap anggota"
          bodyClassName="!p-0"
        >
          {students.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              Belum ada siswa. Bagikan kode <span className="font-mono font-bold">{ws.join_code}</span> atau tautan{' '}
              <span className="font-mono">/bergabung/{ws.join_code}</span>.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-bold">Nama</th>
                  <th className="px-3 py-2.5 font-bold">Bloom Level</th>
                  <th className="px-3 py-2.5 text-center font-bold">Tren</th>
                  <th className="px-3 py-2.5 text-right font-bold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {students.map((m) => {
                  const p = profileOf(m.user_id)
                  return (
                    <tr key={m.user_id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={m.full_name} size="sm" />
                          <span className="font-bold">{m.full_name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {p ? <BloomChip code={codeOf(p.current_level)} /> : <span className="text-xs text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center"><TrendIcon trend={p?.trend} /></td>
                      <td className="px-3 py-3 text-right">{p && <StatusTag status={statusOf(p)} />}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-pill p-1.5 text-muted hover:text-c6"
                          title={`Keluarkan ${m.full_name}`}
                          onClick={() => remove(m.user_id, m.full_name)}
                        >
                          <UserMinus size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={`Bank soal (${questions.length})`} subtitle="Soal AI untuk kelas ini" bodyClassName="!p-3">
          {questions.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              Belum ada soal. <Link to="/guru/soal/baru" className="font-bold text-accent">Buat dengan AI</Link>.
            </p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => (
                <li key={q.id}>
                  <Link
                    to={`/guru/soal/${q.id}`}
                    className="flex items-start gap-2.5 rounded-md border border-line p-3 transition-colors hover:border-accent"
                  >
                    <FileQuestion size={15} className="mt-0.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{q.prompt}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {(q.bloom_target || []).map((c) => <BloomBadge key={c} code={c} size="sm" soft />)}
                        <span className={`ml-1 text-[10px] font-bold ${q.published ? 'text-c3' : 'text-muted'}`}>
                          {q.published ? 'Terbit' : 'Draf'}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
