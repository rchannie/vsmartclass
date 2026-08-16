// Rekomendasi personal siswa (Modul 4) — berbasis bloom_profile individu.
// Logika sama dengan Edge Function `get-recommendations`; di mode demo
// dijalankan lokal dengan template per level.

import { BLOOM_LEVELS, codeOf, levelOf } from './bloom'
import { ADAPTIVE_CONFIG } from './config'

const ACTIVITIES = {
  C1: {
    strengthen: {
      title: 'Kartu ingatan konsep kunci', type: 'Penguatan', minutes: 10,
      why: 'Mengunci fakta dan istilah dasar agar siap dipakai di level berikutnya.',
      resourceLabel: 'Buat kartu belajar di Quizlet',
      resourceUrl: 'https://quizlet.com',
      challengeQuestion: 'Sebutkan 5 istilah kunci dari topik ini beserta definisinya tanpa melihat catatan.',
    },
    climb: {
      title: 'Peta konsep bergambar', type: 'Visual', minutes: 15,
      why: 'Visualisasi membantu mengubah hafalan menjadi pemahaman makna.',
      resourceLabel: 'Materi dasar di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Gambarkan peta konsep yang menghubungkan semua istilah kunci tersebut.',
    },
  },
  C2: {
    strengthen: {
      title: 'Jelaskan ulang dengan kata sendiri', type: 'Penguatan', minutes: 10,
      why: 'Menjelaskan tanpa melihat catatan menguatkan pemahaman konsep.',
      resourceLabel: 'Penjelasan video di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Jelaskan konsep ini kepada orang yang belum pernah mendengarnya — tanpa istilah teknis.',
    },
    climb: {
      title: 'Latihan soal bertahap terbimbing', type: 'Latihan', minutes: 20,
      why: 'Langkah kecil dari contoh ke soal mandiri membangun keterampilan menerapkan.',
      resourceLabel: 'Soal latihan Kemendikbud',
      resourceUrl: 'https://belajar.kemdikbud.go.id',
      challengeQuestion: 'Selesaikan satu soal baru yang belum pernah kamu lihat, lalu jelaskan setiap langkahnya.',
    },
  },
  C3: {
    strengthen: {
      title: 'Variasi soal penerapan', type: 'Latihan', minutes: 20,
      why: 'Beragam konteks soal membuat prosedurmu makin otomatis dan fleksibel.',
      resourceLabel: 'Latihan soal di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Terapkan prosedur ini pada tiga konteks situasi yang berbeda dari contoh yang sudah kamu pelajari.',
    },
    climb: {
      title: 'Bedah soal: temukan strukturnya', type: 'Visual', minutes: 15,
      why: 'Membongkar struktur soal melatih analisis — jembatan dari C3 ke C4.',
      resourceLabel: 'Sumber belajar Kemendikbud',
      resourceUrl: 'https://belajar.kemdikbud.go.id',
      challengeQuestion: 'Ambil satu soal yang sudah kamu selesaikan — uraikan mengapa metode itu bekerja, bukan hanya bagaimana.',
    },
  },
  C4: {
    strengthen: {
      title: 'Bandingkan dua metode penyelesaian', type: 'Latihan', minutes: 20,
      why: 'Membandingkan pendekatan menajamkan analisis hubungan antar konsep.',
      resourceLabel: 'Sumber belajar Kemendikbud',
      resourceUrl: 'https://belajar.kemdikbud.go.id',
      challengeQuestion: 'Gunakan dua metode berbeda pada soal yang sama — mana yang lebih efisien dan mengapa?',
    },
    climb: {
      title: 'Nilai jawaban temanmu dengan rubrik', type: 'Latihan', minutes: 25,
      why: 'Menilai karya orang lain dengan kriteria adalah latihan evaluasi sesungguhnya.',
      resourceLabel: 'Latihan analisis di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Temukan satu kelemahan dalam jawaban contoh berikut dan jelaskan mengapa itu kelemahan.',
    },
  },
  C5: {
    strengthen: {
      title: 'Kritisi model atau klaim yang keliru', type: 'Latihan', minutes: 20,
      why: 'Menemukan cacat argumen menguatkan standar evaluasimu.',
      resourceLabel: 'Referensi lanjutan Kemendikbud',
      resourceUrl: 'https://belajar.kemdikbud.go.id',
      challengeQuestion: 'Tentukan apakah pernyataan ini benar atau salah, dan buktikan dengan argumen yang kuat.',
    },
    climb: {
      title: 'Rancang soal versimu sendiri', type: 'Latihan', minutes: 30,
      why: 'Mencipta soal memaksa semua level di bawahnya bekerja bersama.',
      resourceLabel: 'Eksplorasi lebih di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Buat satu soal orisinal tentang topik ini dan tuliskan kunci jawabannya secara lengkap.',
    },
  },
  C6: {
    strengthen: {
      title: 'Proyek mini dari masalah nyata', type: 'Latihan', minutes: 40,
      why: 'Karya orisinal adalah bukti penguasaan tertinggi — teruslah mencipta.',
      resourceLabel: 'Sumber inspirasi proyek Kemendikbud',
      resourceUrl: 'https://belajar.kemdikbud.go.id',
      challengeQuestion: 'Rancang solusi untuk satu masalah nyata di sekitarmu yang melibatkan konsep ini — jelaskan desain dan proses berpikirmu.',
    },
    climb: {
      title: 'Ajari temanmu (peer teaching)', type: 'Penguatan', minutes: 30,
      why: 'Mengajar adalah bentuk mencipta pengetahuan untuk orang lain.',
      resourceLabel: 'Materi pengayaan di Khan Academy',
      resourceUrl: 'https://id.khanacademy.org',
      challengeQuestion: 'Siapkan penjelasan 5 menit tentang topik ini untuk teman yang belum paham sama sekali.',
    },
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

  // Jika ada level di bawah current yang lebih lemah, prioritaskan itu dulu (ZPD Vygotsky)
  const recs = weakest !== current
    ? [
        { bloom: weakest, kind: 'Kuatkan area terlemah', ...ACTIVITIES[weakest].strengthen },
        { bloom: weakest, kind: 'Kuatkan area terlemah', ...ACTIVITIES[weakest].climb },
        { bloom: current, kind: 'Pertahankan level saat ini', ...ACTIVITIES[current].strengthen },
      ]
    : [
        { bloom: current, kind: 'Penguatan level saat ini', ...ACTIVITIES[current].strengthen },
        { bloom: next, kind: 'Naik level', ...ACTIVITIES[current].climb },
        { bloom: next, kind: 'Naik level', ...ACTIVITIES[next].strengthen },
      ]
  return { weakest, current, next, recs }
}

// Spaced review (Modul 3/4): topik yang belum tuntas (current_level < 6) dan
// belum disentuh selama SPACED_REVIEW_DAYS hari diprioritaskan untuk diulang,
// supaya penguasaan level lemah tidak luruh seiring waktu.
export function findSpacedReviewTopics(profiles = [], now = Date.now()) {
  return profiles
    .filter((p) => (p.current_level || 1) < 6 && p.updated_at)
    .map((p) => ({ ...p, daysSince: Math.floor((now - new Date(p.updated_at).getTime()) / 86400000) }))
    .filter((p) => p.daysSince >= ADAPTIVE_CONFIG.SPACED_REVIEW_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince)
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
