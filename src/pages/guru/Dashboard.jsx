import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, TrendingUp, AlertTriangle, Gauge, Plus, Copy, Check,
  Users, ArrowRight, Minus, TrendingDown,
} from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useClassStats, useMembers } from '../../hooks/useClassData'
import { useClassBloomProfiles } from '../../hooks/useBloomProfile'
import { useRealtimeBloom } from '../../hooks/useRealtime'
import * as api from '../../lib/api'
import { codeOf, statusOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import Avatar from '../../components/ui/Avatar'
import StatusTag from '../../components/ui/StatusTag'
import BloomChip from '../../components/bloom/BloomChip'

export default function TeacherDashboard() {
  const { user, profile } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: stats } = useClassStats(active?.id)
  const { data: members = [] } = useMembers(active?.id)
  const { data: profiles = [] } = useClassBloomProfiles(active?.id)
  useRealtimeBloom(active?.id)

  const students = members.filter((m) => m.role === 'siswa')
  const profileOf = (uid) => profiles.find((p) => p.user_id === uid)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Halo, {profile?.full_name?.split(' ')[0] || 'Guru'}</h1>
          <p className="mt-1 text-sm text-muted">Pantau perkembangan kognitif kelasmu hari ini.</p>
        </div>
        <div className="flex items-center gap-2">
          {workspaces.length > 0 && (
            <select
              aria-label="Pilih kelas"
              className="input !w-auto text-xs font-bold"
              value={active?.id || ''}
              onChange={(e) => setActive(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          <Link to="/guru/soal/baru" className="btn-primary">
            <Sparkles size={15} /> Buat Soal AI
          </Link>
        </div>
      </header>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Soal dibuat AI minggu ini" value={stats?.aiThisWeek ?? '—'} accent="var(--accent)" icon={Sparkles} />
        <StatCard label="Siswa naik ≥1 level" value={stats?.levelUp ?? '—'} accent="var(--c3)" icon={TrendingUp} />
        <StatCard label="Perlu perhatian" value={stats?.attention ?? '—'} accent="var(--c6)" icon={AlertTriangle} />
        <StatCard
          label="Rata-rata kelas"
          value={stats ? `C${stats.avgLevel.toFixed(1)}` : '—'}
          sub={stats ? `≈ level ${codeOf(stats.avgLevel)}` : undefined}
          accent="var(--c4)" icon={Gauge}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Workspace */}
        <div className="space-y-5 lg:col-span-2">
          <WorkspacePanel workspaces={workspaces} onCreated={setActive} />
        </div>

        {/* Roster kelas aktif */}
        <Panel
          className="lg:col-span-3"
          title={`Aktivitas siswa${active ? ` — ${active.name}` : ''}`}
          subtitle="Level Bloom terkini, tren, dan status tiap siswa"
          action={
            active && (
              <Link to={`/guru/kelas/${active.id}`} className="btn-ghost !px-2 !py-1 text-xs">
                Detail <ArrowRight size={13} />
              </Link>
            )
          }
          bodyClassName="!p-0"
        >
          {students.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              Belum ada siswa. Bagikan kode kelas agar siswa bisa bergabung.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-2.5 font-bold">Nama</th>
                  <th className="px-3 py-2.5 font-bold">Bloom Level</th>
                  <th className="px-3 py-2.5 text-center font-bold">Tren</th>
                  <th className="px-3 py-2.5 text-center font-bold">Sesi</th>
                  <th className="px-5 py-2.5 text-right font-bold">Status</th>
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
                        {p ? <BloomChip code={codeOf(p.current_level)} /> : <span className="text-xs text-muted">Belum ada sesi</span>}
                      </td>
                      <td className="px-3 py-3 text-center"><TrendIcon trend={p?.trend} /></td>
                      <td className="px-3 py-3 text-center font-mono text-xs">{p?.session_count ?? 0}</td>
                      <td className="px-5 py-3 text-right">{p && <StatusTag status={statusOf(p)} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  )
}

export function TrendIcon({ trend }) {
  if (trend > 0) return <TrendingUp size={15} className="inline text-c3" aria-label="Naik" />
  if (trend < 0) return <TrendingDown size={15} className="inline text-c6" aria-label="Turun" />
  return <Minus size={15} className="inline text-muted" aria-label="Stabil" />
}

function WorkspacePanel({ workspaces, onCreated }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', school: '', subject: 'Matematika' })
  const [busy, setBusy] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const w = await api.createWorkspace(form, user)
      await qc.invalidateQueries({ queryKey: ['workspaces'] })
      onCreated(w.id)
      setShowForm(false)
      setForm({ name: '', school: '', subject: 'Matematika' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Workspace"
      subtitle="Kelas yang kamu kelola"
      action={
        <button type="button" className="btn-outline !px-2.5 !py-1.5 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Buat
        </button>
      }
    >
      {showForm && (
        <form onSubmit={create} className="fade-up mb-4 space-y-3 rounded-md border border-dashed border-line p-3.5">
          <div>
            <label className="label">Nama kelas</label>
            <input required className="input" placeholder="XI MIPA 2" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Sekolah</label>
            <input className="input" placeholder="SMA Negeri 3 Bandung" value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })} />
          </div>
          <div>
            <label className="label">Mata pelajaran</label>
            <input className="input" placeholder="Matematika" value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full !py-2 text-xs">
            {busy ? 'Membuat…' : 'Buat workspace'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {workspaces.length === 0 && !showForm && (
          <p className="py-4 text-center text-sm text-muted">Belum ada workspace. Buat kelas pertamamu.</p>
        )}
        {workspaces.map((w) => (
          <WorkspaceCard key={w.id} w={w} />
        ))}
      </div>
    </Panel>
  )
}

function WorkspaceCard({ w }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(w.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="rounded-md border border-line p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to={`/guru/kelas/${w.id}`} className="text-sm font-extrabold hover:text-accent">{w.name}</Link>
          <p className="mt-0.5 text-xs text-muted">{[w.school, w.subject].filter(Boolean).join(' · ')}</p>
        </div>
        <Users size={15} className="mt-1 shrink-0 text-muted" />
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill border border-line bg-bg px-2.5 py-1 font-mono text-xs font-bold text-accent hover:border-accent"
        title="Salin kode kelas"
      >
        {w.join_code}
        {copied ? <Check size={12} className="text-c3" /> : <Copy size={12} />}
      </button>
    </div>
  )
}
