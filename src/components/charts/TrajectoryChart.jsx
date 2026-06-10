import { BLOOM, codeOf } from '../../lib/bloom'

// Trajektori kognitif — SVG murni sesuai prototipe.
// X: sesi 1..N, Y: level Bloom 1..6. Area gradient teal, titik berwarna level.
export default function TrajectoryChart({ levels = [], height = 220 }) {
  const W = 640
  const H = height
  const PAD = { l: 40, r: 16, t: 14, b: 26 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  if (levels.length < 2) {
    return <p className="py-6 text-center text-sm text-muted">Butuh minimal 2 sesi untuk menampilkan trajektori.</p>
  }

  const x = (i) => PAD.l + (i / (levels.length - 1)) * innerW
  const y = (lvl) => PAD.t + innerH - ((lvl - 1) / 5) * innerH
  const pts = levels.map((lvl, i) => [x(i), y(lvl)])
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0]},${PAD.t + innerH} L${pts[0][0]},${PAD.t + innerH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trajektori level Bloom per sesi">
      <defs>
        <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid + label sumbu Y (C1–C6 berwarna) */}
      {[1, 2, 3, 4, 5, 6].map((lvl) => (
        <g key={lvl}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(lvl)} y2={y(lvl)} stroke="var(--border)" strokeDasharray="3 4" />
          <text
            x={PAD.l - 10} y={y(lvl) + 4} textAnchor="end"
            fontSize="11" fontWeight="700" fontFamily="'Space Mono', monospace"
            fill={BLOOM[codeOf(lvl)].color}
          >
            C{lvl}
          </text>
        </g>
      ))}

      {/* label sumbu X */}
      {levels.map((_, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
          {i + 1}
        </text>
      ))}

      <path d={area} fill="url(#traj-fill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* titik berwarna bloom-level-nya */}
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r="5.5" fill={BLOOM[codeOf(levels[i])].color} stroke="var(--surface)" strokeWidth="2">
          <title>{`Sesi ${i + 1}: C${levels[i]} ${BLOOM[codeOf(levels[i])].name}`}</title>
        </circle>
      ))}
    </svg>
  )
}
