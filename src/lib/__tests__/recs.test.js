// Uji unit mesin rekomendasi (Modul 4) — dua skenario siswa (celah pondasi
// vs fondasi kuat) dan empat ambang strategi kelas untuk guru.
import { describe, it, expect } from 'vitest'
import { buildStudentRecs, pickClassStrategy } from '../recs'

describe('buildStudentRecs — rekomendasi personal siswa', () => {
  it('profil kosong → tanpa rekomendasi', () => {
    expect(buildStudentRecs(null)).toEqual({ weakest: 'C1', recs: [] })
  })

  it('Skenario A (celah pondasi): level lemah di bawah current diprioritaskan dulu', () => {
    const profile = { c1: 90, c2: 30, c3: 65, c4: 50, c5: 0, c6: 0, current_level: 3 }
    const { weakest, recs } = buildStudentRecs(profile)
    expect(weakest).toBe('C2')
    expect(recs).toHaveLength(3)
    expect(recs[0].bloom).toBe('C2')
    expect(recs[0].kind).toBe('Kuatkan area terlemah')
    expect(recs[2].bloom).toBe('C3')
    expect(recs[2].kind).toBe('Pertahankan level saat ini')
  })

  it('Skenario B (fondasi kuat): fokus penguatan current + pendakian ke level berikutnya', () => {
    const profile = { c1: 90, c2: 85, c3: 50, c4: 55, c5: 0, c6: 0, current_level: 3 }
    const { weakest, recs } = buildStudentRecs(profile)
    expect(weakest).toBe('C3')
    expect(recs[0]).toMatchObject({ bloom: 'C3', kind: 'Penguatan level saat ini' })
    expect(recs[1]).toMatchObject({ bloom: 'C4', kind: 'Naik level' })
    expect(recs[2]).toMatchObject({ bloom: 'C4', kind: 'Naik level' })
  })

  it('setiap rekomendasi memuat field lengkap untuk kartu UI', () => {
    const profile = { c1: 80, c2: 70, c3: 60, c4: 0, c5: 0, c6: 0, current_level: 2 }
    const { recs } = buildStudentRecs(profile)
    for (const rec of recs) {
      expect(rec).toHaveProperty('title')
      expect(rec).toHaveProperty('type')
      expect(rec).toHaveProperty('minutes')
      expect(rec).toHaveProperty('why')
      expect(rec).toHaveProperty('resourceUrl')
      expect(rec).toHaveProperty('challengeQuestion')
    }
  })
})

describe('pickClassStrategy — strategi mengajar dari distribusi kelas', () => {
  const profilesAt = (...levels) => levels.map((l) => ({ current_level: l }))

  it('kelas kosong → Direct Instruction', () => {
    expect(pickClassStrategy([])).toBe('direct')
    expect(pickClassStrategy(null)).toBe('direct')
  })

  it('mayoritas C1–C2 → Direct Instruction', () => {
    expect(pickClassStrategy(profilesAt(1, 2, 2))).toBe('direct')
  })

  it('median level ≥ 3 → Cooperative Learning', () => {
    expect(pickClassStrategy(profilesAt(2, 3, 3))).toBe('cooperative')
  })

  it('median level ≥ 4 → Problem-Based Learning', () => {
    expect(pickClassStrategy(profilesAt(3, 4, 5))).toBe('pbl')
  })

  it('≥ 40% siswa di C5–C6 → Project Exhibition', () => {
    expect(pickClassStrategy(profilesAt(2, 2, 5, 5, 6))).toBe('exhibition')
  })
})
