import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClassHeatmap from '../ClassHeatmap'

describe('ClassHeatmap', () => {
  it('menampilkan pesan kosong bila belum ada data sesi', () => {
    render(<ClassHeatmap rows={[]} />)
    expect(screen.getByText('Belum ada data sesi siswa.')).toBeInTheDocument()
  })

  it('menampilkan header level Bloom dan persentase per topik', () => {
    render(
      <ClassHeatmap
        rows={[{ topic: 'Sistem Persamaan Linear', cells: [20, 20, 20, 20, 20, 0] }]}
      />,
    )
    expect(screen.getByText('Sistem Persamaan Linear')).toBeInTheDocument()
    for (const code of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) {
      expect(screen.getByText(code)).toBeInTheDocument()
    }
    expect(screen.getAllByText('20%')).toHaveLength(5)
    expect(screen.getByText('·')).toBeInTheDocument() // sel 0% dirender sebagai titik, bukan "0%"
  })
})
