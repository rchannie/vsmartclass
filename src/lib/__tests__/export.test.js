// Uji unit ekspor CSV (Modul 5 — guru). PDF tidak diuji di sini karena
// jspdf/jspdf-autotable ditarik lewat import() dinamis khusus browser nyata.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportClassCSV } from '../export'

const profiles = [
  {
    full_name: 'Aisyah Putri', topic: 'Sistem Persamaan Linear',
    c1: 92, c2: 84, c3: 71, c4: 60, c5: 22, c6: 10,
    current_level: 4, trend: 1, session_count: 6, updated_at: '2026-06-10T08:00:00Z',
  },
]

beforeEach(() => {
  // jsdom belum mengimplementasikan createObjectURL/revokeObjectURL secara default.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

describe('exportClassCSV', () => {
  it('memicu unduhan dengan nama file & tipe CSV yang benar', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let capturedAnchor = null
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      capturedAnchor = node
      return node
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    exportClassCSV('XI MIPA 2', profiles)

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(capturedAnchor.download).toMatch(/^xi-mipa-2-bloom-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/csv;charset=utf-8;')

    const text = await blob.text()
    expect(text).toContain('Aisyah Putri')
    expect(text).toContain('Sistem Persamaan Linear')
    expect(text).toContain('C4') // level saat ini
    expect(text).toContain('Naik') // trend > 0

    appendSpy.mockRestore()
  })

  it('nama workspace tak biasa tetap menghasilkan slug nama file yang aman', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let capturedAnchor = null
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      capturedAnchor = node
      return node
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    exportClassCSV('Kelas "Unggulan" — 2026!', profiles)
    expect(capturedAnchor.download).toMatch(/^kelas-unggulan-2026-bloom-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
