// Rekomendasi personal siswa (Modul 4) — berbasis bloom_profile individu.
// Logika sama dengan Edge Function `get-recommendations`; di mode demo
// dijalankan lokal dengan template per level.

import { BLOOM_LEVELS, codeOf, levelOf } from './bloom'

const ACTIVITIES = {
  C1: {
    strengthen: { title: 'Kartu ingatan konsep kunci', type: 'Penguatan', minutes: 10, why: 'Mengunci fakta dan istilah dasar agar siap dipakai di level berikutnya.' },
    climb: { title: 'Peta konsep bergambar', type: 'Visual', minutes: 15, why: 'Visualisasi membantu mengubah hafalan menjadi pemahaman makna.' },
  },
  C2: {
    strengthen: { title: 'Jelaskan ulang dengan kata sendiri', type: 'Penguatan', minutes: 10, why: 'Menjelaskan tanpa melihat catatan menguatkan pemahaman konsep.' },
    climb: { title: 'Latihan soal bertahap terbimbing', type: 'Latihan', minutes: 20, why: 'Langkah kecil dari contoh ke soal mandiri membangun keterampilan menerapkan.' },
  },
  C3: {
    strengthen: { title: 'Variasi soal penerapan', type: 'Latihan', minutes: 20, why: 'Beragam konteks soal membuat prosedurmu makin otomatis dan fleksibel.' },
    climb: { title: 'Bedah soal: temukan strukturnya', type: 'Visual', minutes: 15, why: 'Membongkar struktur soal melatih analisis — jembatan dari C3 ke C4.' },
  },
  C4: {
    strengthen: { title: 'Bandingkan dua metode penyelesaian', type: 'Latihan', minutes: 20, why: 'Membandingkan pendekatan menajamkan analisis hubungan antar konsep.' },
    climb: { title: 'Nilai jawaban temanmu dengan rubrik', type: 'Latihan', minutes: 25, why: 'Menilai karya orang lain dengan kriteria adalah latihan evaluasi sesungguhnya.' },
  },
  C5: {
    strengthen: { title: 'Kritisi model atau klaim yang keliru', type: 'Latihan', minutes: 20, why: 'Menemukan cacat argumen menguatkan standar evaluasimu.' },
    climb: { title: 'Rancang soal versimu sendiri', type: 'Latihan', minutes: 30, why: 'Mencipta soal memaksa semua level di bawahnya bekerja bersama.' },
  },
  C6: {
    strengthen: { title: 'Proyek mini dari masalah nyata', type: 'Latihan', minutes: 40, why: 'Karya orisinal adalah bukti penguasaan tertinggi — teruslah mencipta.' },
    climb: { title: 'Ajari temanmu (peer teaching)', type: 'Penguatan', minutes: 30, why: 'Mengajar adalah bentuk mencipta pengetahuan untuk orang lain.' },
  },
}

// 3 rekomendasi: 1 penguatan level saat ini + 2 untuk naik level
export function buildStudentRecs(profile) {
  if (!profile) return { weakest: 'C1', recs: [] }

  const values = BLOOM_LEVELS.map((c) => profile[c.toLowerCase()] ?? 0)
  const current = codeOf(profile.current_level || 1)
  const next = codeOf(Math.min(6, levelOf(current) + 1))

  // level terlemah = nilai terendah pada radar (di antara level yang relevan)
  const relevant = BLOOM_LEVELS.slice(0, Math.min(6, levelOf(current) + 1))
  const weakest = relevant.reduce(
    (min, c) => (values[BLOOM_LEVELS.indexOf(c)] < values[BLOOM_LEVELS.indexOf(min)] ? c : min),
    relevant[0],
  )

  const recs = [
    { bloom: current, kind: 'Penguatan level saat ini', ...ACTIVITIES[current].strengthen },
    { bloom: next, kind: 'Naik level', ...ACTIVITIES[current].climb },
    { bloom: next, kind: 'Naik level', ...ACTIVITIES[next].strengthen },
  ]
  return { weakest, current, next, recs }
}

// Strategi kelas untuk guru — pilih berdasarkan median level kelas
export function pickClassStrategy(profiles) {
  if (!profiles?.length) return 'direct'
  const levels = profiles.map((p) => p.current_level || 1).sort((a, b) => a - b)
  const median = levels[Math.floor(levels.length / 2)]
  const top = profiles.filter((p) => (p.current_level || 1) >= 5).length / profiles.length
  if (top >= 0.4) return 'exhibition'
  if (median >= 4) return 'pbl'
  if (median >= 3) return 'cooperative'
  return 'direct'
}
