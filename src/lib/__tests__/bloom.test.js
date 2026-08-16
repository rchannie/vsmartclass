// Uji unit fondasi Taksonomi Bloom (Modul 3) — sesuai aturan di proposal:
// streak rule adaptasi, tier kesulitan, dan status siswa.
import { describe, it, expect } from 'vitest'
import { levelOf, codeOf, adaptNext, difficultyTierOf, statusOf, summarizeMisconceptions } from '../bloom'

describe('levelOf / codeOf', () => {
  it('mengubah kode Bloom menjadi angka level', () => {
    expect(levelOf('C1')).toBe(1)
    expect(levelOf('C6')).toBe(6)
  })

  it('fallback ke level 1 untuk input tidak valid', () => {
    expect(levelOf(null)).toBe(1)
    expect(levelOf('x')).toBe(1)
  })

  it('meng-clamp level ke rentang C1–C6', () => {
    expect(codeOf(0)).toBe('C1')
    expect(codeOf(3)).toBe('C3')
    expect(codeOf(9)).toBe('C6')
  })
})

describe('adaptNext — aturan consecutive-success streak (Modul 3)', () => {
  it('jawaban tepat target pertama kali: target tetap, streak menjadi 1', () => {
    expect(adaptNext('C3', 'C3', 0)).toEqual({ nextTarget: 'C3', streak: 1, direction: 0 })
  })

  it('dua jawaban berturut-turut di/atas target: target naik satu level, streak reset', () => {
    expect(adaptNext('C3', 'C3', 1)).toEqual({ nextTarget: 'C4', streak: 0, direction: 1 })
  })

  it('jawaban di atas target juga membangun streak', () => {
    expect(adaptNext('C5', 'C3', 1)).toEqual({ nextTarget: 'C4', streak: 0, direction: 1 })
  })

  it('jawaban di bawah target: turun seketika ke level pilihan siswa, streak reset', () => {
    expect(adaptNext('C2', 'C4', 2)).toEqual({ nextTarget: 'C2', streak: 0, direction: -1 })
  })

  it('satu jawaban benar saja tidak menaikkan target (cegah kenaikan prematur)', () => {
    const step1 = adaptNext('C4', 'C4', 0)
    expect(step1.nextTarget).toBe('C4')
    const step2 = adaptNext('C4', step1.nextTarget, step1.streak)
    expect(step2.nextTarget).toBe('C5')
  })

  it('target maksimum dibatasi C6', () => {
    expect(adaptNext('C6', 'C6', 5).nextTarget).toBe('C6')
  })
})

describe('difficultyTierOf — tier diturunkan dari bloom_target tertinggi', () => {
  it('C1–C2 → Dasar', () => {
    expect(difficultyTierOf(['C1', 'C2'])).toBe('Dasar')
  })

  it('C3–C4 → Menengah', () => {
    expect(difficultyTierOf(['C2', 'C3', 'C4'])).toBe('Menengah')
  })

  it('C5–C6 → Lanjut', () => {
    expect(difficultyTierOf(['C3', 'C5'])).toBe('Lanjut')
  })

  it('array kosong → Dasar', () => {
    expect(difficultyTierOf([])).toBe('Dasar')
  })
})

describe('statusOf — flag intervensi guru (Modul 5)', () => {
  it('profil kosong → perlu perhatian', () => {
    expect(statusOf(null)).toBe('attention')
  })

  it('level ≤ 1 atau tren negatif → perlu perhatian', () => {
    expect(statusOf({ current_level: 1, trend: 1, session_count: 5 })).toBe('attention')
    expect(statusOf({ current_level: 4, trend: -1, session_count: 5 })).toBe('attention')
  })

  it('tren stagnan selama ≥ 3 sesi → plateau', () => {
    expect(statusOf({ current_level: 3, trend: 0, session_count: 3 })).toBe('plateau')
  })

  it('belum 3 sesi atau tren naik → on-track', () => {
    expect(statusOf({ current_level: 3, trend: 0, session_count: 2 })).toBe('on-track')
    expect(statusOf({ current_level: 2, trend: 1, session_count: 6 })).toBe('on-track')
  })
})

describe('summarizeMisconceptions — pola kesalahan per topik (Modul 5)', () => {
  it('tidak ada input → array kosong', () => {
    expect(summarizeMisconceptions([])).toEqual([])
  })

  it('jawaban di/atas target tidak dihitung sebagai miskonsepsi', () => {
    const answers = [
      { topic: 'SPL', bloom_target: 'C3', bloom_chosen: 'C3' },
      { topic: 'SPL', bloom_target: 'C3', bloom_chosen: 'C4' },
    ]
    expect(summarizeMisconceptions(answers)).toEqual([])
  })

  it('jawaban di bawah target dihitung sebagai miss, rate = miss/total', () => {
    const answers = [
      { topic: 'SPL', bloom_target: 'C4', bloom_chosen: 'C2' },
      { topic: 'SPL', bloom_target: 'C4', bloom_chosen: 'C2' },
      { topic: 'SPL', bloom_target: 'C3', bloom_chosen: 'C3' },
    ]
    const [result] = summarizeMisconceptions(answers)
    expect(result.topic).toBe('SPL')
    expect(result.misses).toBe(2)
    expect(result.total).toBe(3)
    expect(result.rate).toBe(67)
    expect(result.weakestTarget).toBe('C4')
  })

  it('diperingkat menurun berdasarkan rate, topik tanpa miss tidak muncul', () => {
    const answers = [
      { topic: 'A', bloom_target: 'C4', bloom_chosen: 'C1' }, // 1/1 = 100%
      { topic: 'B', bloom_target: 'C4', bloom_chosen: 'C1' },
      { topic: 'B', bloom_target: 'C4', bloom_chosen: 'C4' }, // 1/2 = 50%
      { topic: 'C', bloom_target: 'C2', bloom_chosen: 'C2' }, // tidak ada miss
    ]
    const result = summarizeMisconceptions(answers)
    expect(result.map((r) => r.topic)).toEqual(['A', 'B'])
  })
})
