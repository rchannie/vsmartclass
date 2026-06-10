import { BLOOM_LEVELS, BLOOM } from '../../lib/bloom'

// Bloom Class Heatmap — CSS grid murni (ikuti prototipe, bukan library chart).
// rows: [{ topic, cells: [pctC1..pctC6] }] — pct 0..100 (% siswa di level itu)
export default function ClassHeatmap({ rows = [] }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">Belum ada data sesi siswa.</p>
  }
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-1.5"
        style={{ gridTemplateColumns: 'minmax(140px, 1.2fr) repeat(6, minmax(56px, 1fr))' }}
      >
        <span />
        {BLOOM_LEVELS.map((code) => (
          <span key={code} className="text-center font-mono text-[11px] font-bold" style={{ color: BLOOM[code].color }}>
            {code}
          </span>
        ))}

        {rows.map((row) => (
          <Row key={row.topic} row={row} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted">Angka = % siswa yang berada di level tersebut per topik. Semakin pekat, semakin banyak.</p>
    </div>
  )
}

function Row({ row }) {
  return (
    <>
      <span className="flex items-center pr-2 text-xs font-bold leading-tight">{row.topic}</span>
      {row.cells.map((pct, i) => {
        const code = BLOOM_LEVELS[i]
        const intensity = Math.max(0.07, pct / 100)
        return (
          <div
            key={code}
            className="flex h-11 cursor-default items-center justify-center rounded-sm font-mono text-xs font-bold transition-transform duration-150 hover:scale-[1.06]"
            style={{
              background: `color-mix(in srgb, ${BLOOM[code].color} ${Math.round(intensity * 100)}%, var(--surface))`,
              color: intensity > 0.55 ? '#fff' : 'var(--text)',
            }}
            title={`${row.topic} — ${code} ${BLOOM[code].name}: ${pct}% siswa`}
          >
            {pct > 0 ? `${pct}%` : '·'}
          </div>
        )
      })}
    </>
  )
}
