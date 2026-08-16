// Konstanta Taksonomi Bloom Revisi (Anderson & Krathwohl) — sumber tunggal
// untuk nama, warna (via CSS token), deskripsi, dan mapping strategi mengajar.

import { ADAPTIVE_CONFIG } from './config'

export const BLOOM_LEVELS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']

export const BLOOM = {
  C1: {
    level: 1,
    code: 'C1',
    name: 'Mengingat',
    color: 'var(--c1)',
    desc: 'Mengambil kembali pengetahuan dari memori — fakta, istilah, konsep dasar.',
    verbs: 'menyebutkan, mengidentifikasi, mengingat kembali',
  },
  C2: {
    level: 2,
    code: 'C2',
    name: 'Memahami',
    color: 'var(--c2)',
    desc: 'Membangun makna — menjelaskan, merangkum, memberi contoh.',
    verbs: 'menjelaskan, merangkum, mengklasifikasikan',
  },
  C3: {
    level: 3,
    code: 'C3',
    name: 'Menerapkan',
    color: 'var(--c3)',
    desc: 'Menggunakan prosedur pada situasi yang dikenal maupun baru.',
    verbs: 'menerapkan, menghitung, menyelesaikan',
  },
  C4: {
    level: 4,
    code: 'C4',
    name: 'Menganalisis',
    color: 'var(--c4)',
    desc: 'Mengurai materi menjadi bagian dan menentukan hubungan antar bagian.',
    verbs: 'menguraikan, membandingkan, mengorganisasi',
  },
  C5: {
    level: 5,
    code: 'C5',
    name: 'Mengevaluasi',
    color: 'var(--c5)',
    desc: 'Membuat penilaian berdasarkan kriteria dan standar.',
    verbs: 'menilai, mengkritisi, memvalidasi',
  },
  C6: {
    level: 6,
    code: 'C6',
    name: 'Mencipta',
    color: 'var(--c6)',
    desc: 'Menggabungkan elemen menjadi keseluruhan baru yang koheren dan orisinal.',
    verbs: 'merancang, mengonstruksi, memproduksi',
  },
}

export const levelOf = (code) => Number(String(code).replace(/\D/g, '')) || 1
export const codeOf = (level) => `C${Math.min(6, Math.max(1, Math.round(level)))}`

// Aturan adaptasi sesi (Modul 3) — consecutive-success streak:
//   chosen ≥ target, streak < 2 → target tetap, streak bertambah
//   chosen ≥ target, streak ≥ 2 → target naik satu level (maks C6), streak reset
//   chosen <  target            → target turun ke level pilihan siswa, streak reset
export function adaptNext(chosenCode, targetCode, streak) {
  const chosen = levelOf(chosenCode)
  const target = levelOf(targetCode)
  const hit = chosen >= target
  const newStreak = hit ? streak + 1 : 0
  const needed = ADAPTIVE_CONFIG.STREAK_TO_LEVEL_UP
  const nextLevel = newStreak >= needed ? Math.min(6, target + 1) : hit ? target : chosen
  return {
    nextTarget: codeOf(nextLevel),
    streak: newStreak >= needed ? 0 : newStreak,
    direction: Math.sign(nextLevel - target),
  }
}

// Latar lembut warna bloom (proporsional terhadap surface — aman utk dark mode)
export const softBg = (code, pct = 12) =>
  `color-mix(in srgb, ${BLOOM[code].color} ${pct}%, var(--surface))`

// Strategi mengajar berbasis distribusi kelas (Modul 4 — guru)
export const TEACHING_STRATEGIES = [
  {
    id: 'direct',
    range: ['C1', 'C2'],
    title: 'Direct Instruction',
    when: 'Mayoritas siswa di C1–C2',
    desc: 'Bangun fondasi lewat demonstrasi visual bertahap dan analogi konkret sebelum berpindah ke latihan mandiri.',
    methods: ['Demonstrasi visual', 'Analogi konkret', 'Worked examples'],
  },
  {
    id: 'cooperative',
    range: ['C2', 'C3'],
    title: 'Cooperative Learning',
    when: 'Siswa tersebar di C2–C3',
    desc: 'Pasangkan siswa lintas level untuk saling menjelaskan — pemahaman menguat saat dipakai untuk mengajar teman.',
    methods: ['Think-Pair-Share', 'Diskusi kelompok kecil', 'Peer explanation'],
  },
  {
    id: 'pbl',
    range: ['C3', 'C4'],
    title: 'Problem-Based Learning',
    when: 'Kelas sudah nyaman di C3–C4',
    desc: 'Hadirkan masalah kontekstual terbuka dan pandu lewat pertanyaan Socratic agar siswa membangun analisis sendiri.',
    methods: ['Masalah kontekstual', 'Socratic questioning', 'Investigasi terbimbing'],
  },
  {
    id: 'exhibition',
    range: ['C5', 'C6'],
    title: 'Project Exhibition',
    when: 'Sebagian siswa mencapai C5–C6',
    desc: 'Beri ruang mencipta: proyek terbuka yang dipresentasikan, dengan siswa level tinggi menjadi peer teacher.',
    methods: ['Proyek terbuka', 'Peer teaching', 'Presentasi karya'],
  },
]

// Tipe aktivitas rekomendasi siswa
export const REC_TYPES = ['Visual', 'Latihan', 'Penguatan']

// Scaffolding tips — ditampilkan saat engine turunkan target (arah negatif)
export const SCAFFOLD_TIPS = {
  C1: 'Coba baca ulang materi pokoknya — fokus pada fakta dan definisi kuncinya.',
  C2: 'Coba jelaskan konsep ini dengan kata-katamu sendiri tanpa melihat catatan.',
  C3: 'Latih satu contoh soal serupa langkah demi langkah sebelum lanjut.',
  C4: 'Pecah masalah menjadi bagian kecil dan cari hubungan antar bagiannya.',
  C5: 'Bandingkan dua pendekatan berbeda — mana yang lebih kuat dan mengapa?',
  C6: 'Rancang satu contoh orisinal yang menerapkan konsep ini di situasi baru.',
}

// Tier kesulitan soal — diturunkan dari bloom_target tertinggi
// Dasar (C1–C2) · Menengah (C3–C4) · Lanjut (C5–C6)
export const DIFFICULTY_TIERS = {
  Dasar:    { label: 'Dasar',    range: 'C1–C2', className: 'bg-[color:var(--c2)]/10 text-[color:var(--c2)]' },
  Menengah: { label: 'Menengah', range: 'C3–C4', className: 'bg-[color:var(--c4)]/10 text-[color:var(--c4)]' },
  Lanjut:   { label: 'Lanjut',   range: 'C5–C6', className: 'bg-[color:var(--c5)]/10 text-[color:var(--c5)]' },
}

export function difficultyTierOf(bloomTarget = []) {
  const max = Math.max(1, ...bloomTarget.map(levelOf))
  if (max <= 2) return 'Dasar'
  if (max <= 4) return 'Menengah'
  return 'Lanjut'
}

// Status siswa untuk roster kelas: on-track / plateau / perlu perhatian
export function statusOf(profile) {
  if (!profile) return 'attention'
  if (profile.current_level <= 1 || profile.trend < 0) return 'attention'
  if (profile.trend === 0 && profile.session_count >= 3) return 'plateau'
  return 'on-track'
}

// Pola kesalahan/miskonsepsi per topik (guru — Modul 5): jawaban yang levelnya
// di BAWAH target soal menandakan siswa belum benar-benar menguasai level yang
// ditargetkan, dikelompokkan & diperingkat per topik agar guru tahu di mana
// perlu intervensi. answers: [{ topic, bloom_target, bloom_chosen }]
export function summarizeMisconceptions(answers = []) {
  const byTopic = new Map()
  const ensure = (topic) => {
    if (!byTopic.has(topic)) byTopic.set(topic, { topic, misses: 0, total: 0, levelCounts: {} })
    return byTopic.get(topic)
  }
  answers.forEach((a) => {
    if (!a.topic) return
    const t = ensure(a.topic)
    t.total += 1
    if (!a.bloom_target || !a.bloom_chosen) return
    const gap = levelOf(a.bloom_target) - levelOf(a.bloom_chosen)
    if (gap <= 0) return // jawaban di/atas target → bukan miskonsepsi
    t.misses += 1
    t.levelCounts[a.bloom_target] = (t.levelCounts[a.bloom_target] || 0) + 1
  })
  return [...byTopic.values()]
    .filter((t) => t.misses > 0)
    .map((t) => ({
      ...t,
      rate: t.total ? Math.round((t.misses / t.total) * 100) : 0,
      weakestTarget: Object.entries(t.levelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null,
    }))
    .sort((a, b) => b.rate - a.rate)
}
