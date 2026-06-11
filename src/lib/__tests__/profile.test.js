// Uji unit pembaruan Bloom Profile akhir sesi (Modul 3, inter-session):
// mastery blend 60/40, ambang current_level ≥ 60, tren, dan hitungan sesi.
import { describe, it, expect } from 'vitest'
import { computeProfileUpdate } from '../demo'

const answersAt = (...codes) => codes.map((c) => ({ bloom_chosen: c }))

describe('computeProfileUpdate — mastery blend 60/40', () => {
  it('menghitung blend: nilai baru = lama × 0.6 + evidence × 100 × 0.4', () => {
    const old = { c1: 50, c2: 50, c3: 0, c4: 0, c5: 0, c6: 0, current_level: 2, session_count: 4 }
    const next = computeProfileUpdate(old, answersAt('C3', 'C3', 'C3', 'C3', 'C3', 'C3'))
    // evidence C1–C3 = 6/6 = 1 → 50×0.6 + 100×0.4 = 70 ; 0×0.6 + 40 = 40
    expect(next.c1).toBe(70)
    expect(next.c2).toBe(70)
    expect(next.c3).toBe(40)
    expect(next.c4).toBe(0)
  })

  it('current_level = level tertinggi dengan mastery ≥ 60', () => {
    const old = { c1: 50, c2: 50, c3: 0, c4: 0, c5: 0, c6: 0, current_level: 1, session_count: 0 }
    const next = computeProfileUpdate(old, answersAt('C3', 'C3', 'C3', 'C3', 'C3', 'C3'))
    expect(next.current_level).toBe(2) // c1=70, c2=70 ≥ 60; c3=40 < 60
  })

  it('satu sesi bagus tidak langsung mendongkrak profil baru (anti-lonjakan)', () => {
    const next = computeProfileUpdate(null, answersAt('C4', 'C4', 'C4', 'C4', 'C4', 'C4'))
    // tanpa riwayat: evidence 1 → 0×0.6 + 40 = 40 < 60 → tetap level 1
    expect(next.c4).toBe(40)
    expect(next.current_level).toBe(1)
  })

  it('tren = arah perubahan current_level', () => {
    const naik = computeProfileUpdate(
      { c1: 55, c2: 55, c3: 0, c4: 0, c5: 0, c6: 0, current_level: 1, session_count: 1 },
      answersAt('C2', 'C2', 'C2', 'C2', 'C2', 'C2'),
    )
    expect(naik.current_level).toBe(2)
    expect(naik.trend).toBe(1)

    const turun = computeProfileUpdate(
      { c1: 65, c2: 65, c3: 65, c4: 0, c5: 0, c6: 0, current_level: 3, session_count: 5 },
      answersAt('C1', 'C1', 'C1', 'C1', 'C1', 'C1'),
    )
    // c3 = 65×0.6 + 0 = 39 < 60 → level turun
    expect(turun.trend).toBe(-1)
  })

  it('session_count bertambah satu setiap sesi selesai', () => {
    const next = computeProfileUpdate(
      { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, current_level: 1, session_count: 7 },
      answersAt('C1', 'C2'),
    )
    expect(next.session_count).toBe(8)
  })

  it('jawaban level tinggi menjadi evidence untuk semua level di bawahnya', () => {
    const next = computeProfileUpdate(null, answersAt('C5', 'C5'))
    // evidence C1–C5 = 1 → semua 40; C6 = 0
    expect(next.c1).toBe(40)
    expect(next.c5).toBe(40)
    expect(next.c6).toBe(0)
  })
})
