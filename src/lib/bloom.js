// Konstanta Taksonomi Bloom Revisi (Anderson & Krathwohl) — sumber tunggal
// untuk nama, warna (via CSS token), deskripsi, dan mapping strategi mengajar.

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

// Status siswa untuk roster kelas: on-track / plateau / perlu perhatian
export function statusOf(profile) {
  if (!profile) return 'attention'
  if (profile.current_level <= 1 || profile.trend < 0) return 'attention'
  if (profile.trend === 0 && profile.session_count >= 3) return 'plateau'
  return 'on-track'
}
