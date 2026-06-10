import { useMemo, useState } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Gauge } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useClassStats, useSessions } from '../../hooks/useClassData'
import { useClassBloomProfiles } from '../../hooks/useBloomProfile'
import { useRealtimeBloom } from '../../hooks/useRealtime'
import { codeOf, statusOf } from '../../lib/bloom'
import Panel from '../../components/ui/Panel'
import StatCard from '../../components/ui/StatCard'
import Avatar from '../../components/ui/Avatar'
import StatusTag from '../../components/ui/StatusTag'
import BloomChip from '../../components/bloom/BloomChip'
import BloomLegend from '../../components/bloom/BloomLegend'
import ClassHeatmap from '../../components/charts/ClassHeatmap'
import TrajectoryChart from '../../components/charts/TrajectoryChart'
import GrowthBars from '../../components/charts/GrowthBars'
import BloomRadar from '../../components/charts/BloomRadar'
import { TrendIcon } from './Dashboard'

export default function TeacherAnalytics() {
  const { user } = useAuth()
  const { workspaces, active, setActive } = useActiveWorkspace(user?.id)
  const { data: stats } = useClassStats(active?.id)
  const { data: profiles = [] } = useClassBloomProfiles(active?.id)
  const { data: sessions = [] } = useSessions(active?.id)
  useRealtimeBloom(active?.id) // heatmap & stat cards live saat siswa menyelesaikan sesi

  const students = useMemo(() => {
    const seen = new Map()
    profiles.forEach((p) => { if (!seen.has(p.user_id)) seen.set(p.user_id, p.full_name) })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [profiles])

  const [selectedStudent, setSelectedStudent] = useState('')
  const studentId = selectedStudent || students[0]?.id || ''

  // Heatmap: baris = topik, sel = % siswa di level itu
  const heatmapRows = useMemo(() => {
    const byTopic = new Map()
    profiles.forEach((p) => {
      if (!byTopic.has(p.topic)) byTopic.set(p.topic, [])
      byTopic.get(p.topic).push(p)
    })
    return [...byTopic.entries()].map(([topic, list]) => {
      const cells = [1, 2, 3, 4, 5, 6].map((lvl) => {
        const n = list.filter((p) => p.current_level === lvl).length
        return Math.round((n / list.length) * 100)
      })
      return { topic, cells }
    })
  }, [profiles])

  // Trajektori siswa terpilih
  const trajectory = useMemo(
    () => sessions.filter((s) => s.user_id === studentId).map((s) => s.bloom_level || 1),
    [sessions, studentId],
  )

  // Growth: 4 minggu terakhir, distribusi level sesi selesai per minggu.
  // Anchor = sesi terbaru (bukan Date.now) agar murni terhadap data.
  const growthWeeks = useMemo(() => {
    const anchor = sessions.length
      ? Math.max(...sessions.map((s) => new Date(s.completed_at).getTime()))
      : 0
    return [3, 2, 1, 0].map((w) => {
      const start = anchor - (w + 1) * 7 * 86400000
      const end = anchor - w * 7 * 86400000 + 1
      const dist = {}
      sessions.forEach((s) => {
        const t = new Date(s.completed_at).getTime()
        if (t >= start && t < end && s.bloom_level) {
          const code = codeOf(s.bloom_level)
          dist[code] = (dist[code] || 0) + 1
        }
      })
      return { label: `Mgg ${4 - w}`, dist }
    })
  }, [sessions])

  const selectedProfile = profiles.find((p) => p.user_id === studentId)
  const studentSelector = (
    <select className="input !w-auto !py-1.5 text-xs font-bold" value={studentId} onChange={(e) => setSelectedStudent(e.target.value)}>
      {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Bloom Analytics</h1>
          <p className="mt-1 text-sm text-muted">Peta kognitif kelas — diperbarui langsung saat siswa menyelesaikan sesi.</p>
        </div>
        {workspaces.length > 0 && (
          <select className="input !w-auto text-xs font-bold" value={active?.id || ''} onChange={(e) => setActive(e.target.value)}>
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Soal dibuat AI minggu ini" value={stats?.aiThisWeek ?? '—'} accent="var(--accent)" icon={Sparkles} />
        <StatCard label="Siswa naik ≥1 level" value={stats?.levelUp ?? '—'} accent="var(--c3)" icon={TrendingUp} />
        <StatCard label="Perlu perhatian" value={stats?.attention ?? '—'} accent="var(--c6)" icon={AlertTriangle} />
        <StatCard label="Rata-rata kelas" value={stats ? `C${stats.avgLevel.toFixed(1)}` : '—'} accent="var(--c4)" icon={Gauge} />
      </div>

      <Panel
        title="Bloom Class Heatmap"
        subtitle="Distribusi % siswa per level Bloom untuk tiap topik"
        action={<BloomLegend compact className="hidden md:flex" />}
      >
        <ClassHeatmap rows={heatmapRows} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Trajektori kognitif siswa" subtitle="Level Bloom per sesi" action={students.length > 0 && studentSelector}>
          <TrajectoryChart levels={trajectory} />
        </Panel>

        <Panel title="Pertumbuhan kelas" subtitle="Distribusi level Bloom per minggu (stacked 100%)">
          <GrowthBars weeks={growthWeeks} />
          <BloomLegend compact className="mt-4 justify-center" />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel
          className="lg:col-span-2"
          title="Profil Bloom individual"
          subtitle={selectedProfile ? `${selectedProfile.full_name} · ${selectedProfile.topic}` : 'Pilih siswa'}
          action={students.length > 0 && studentSelector}
        >
          <BloomRadar profile={selectedProfile} />
        </Panel>

        <Panel className="lg:col-span-3" title="Aktivitas kelas" subtitle="Ringkasan posisi tiap siswa" bodyClassName="!p-0">
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
              {profiles.map((p) => (
                <tr
                  key={p.id}
                  className={`cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-bg ${p.user_id === studentId ? 'bg-bg' : ''}`}
                  onClick={() => setSelectedStudent(p.user_id)}
                >
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.full_name} size="sm" />
                      <span className="font-bold">{p.full_name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3"><BloomChip code={codeOf(p.current_level)} /></td>
                  <td className="px-3 py-3 text-center"><TrendIcon trend={p.trend} /></td>
                  <td className="px-3 py-3 text-center font-mono text-xs">{p.session_count}</td>
                  <td className="px-5 py-3 text-right"><StatusTag status={statusOf(p)} /></td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">Belum ada data sesi siswa.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  )
}
