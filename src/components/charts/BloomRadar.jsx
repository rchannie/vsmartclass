import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import { BLOOM_LEVELS, BLOOM } from '../../lib/bloom'

// Radar profil Bloom individual — 6 sumbu C1..C6, nilai mastery 0–100
export default function BloomRadar({ profile, height = 260, name = 'Mastery' }) {
  const data = BLOOM_LEVELS.map((code) => ({
    axis: code,
    value: profile?.[code.toLowerCase()] ?? 0,
  }))

  // Alt text ringkas untuk pembaca layar — grafik radar SVG dari Recharts
  // tidak otomatis punya alternatif teks (WCAG 1.1.1).
  const summary = `Radar kognitif ${name}: ` +
    data.map((d) => `${d.axis} ${BLOOM[d.axis].name} ${d.value} dari 100`).join(', ')

  return (
    <div role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={({ payload, x, y, textAnchor }) => (
              <text
                x={x} y={y} textAnchor={textAnchor}
                fontSize={12} fontWeight={700} fontFamily="'Space Mono', monospace"
                fill={BLOOM[payload.value].color}
              >
                {payload.value}
              </text>
            )}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={name}
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.28}
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--accent)' }}
          />
          <Tooltip
            formatter={(v, _n, item) => [`${v} / 100`, `${item.payload.axis} · ${BLOOM[item.payload.axis].name}`]}
            contentStyle={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--text)',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
