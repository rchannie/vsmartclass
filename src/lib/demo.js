// Mode demo — database lokal di localStorage, seed sesuai "CONTOH DATA DUMMY"
// pada Developer Prompt. Dipakai otomatis saat env Supabase kosong.

import { BLOOM, BLOOM_LEVELS, codeOf, levelOf } from './bloom'

const DB_KEY = 'vsc-demo-db-v1'
const SESSION_KEY = 'vsc-demo-session-v1'

const uid = () => crypto.randomUUID()

const TOPIC_SPL = 'Sistem Persamaan Linear'

const seedProfiles = [
  { user: 'u-aisyah', vals: [92, 84, 71, 60, 22, 10], level: 4, trend: 1, sessions: [2, 2, 3, 3, 4, 4] },
  { user: 'u-dimas', vals: [88, 75, 60, 48, 20, 8], level: 3, trend: 0, sessions: [1, 2, 2, 3, 3, 3] },
  { user: 'u-citra', vals: [95, 90, 85, 70, 50, 30], level: 5, trend: 1, sessions: [3, 3, 4, 4, 5, 5] },
  { user: 'u-bagas', vals: [70, 55, 40, 20, 8, 2], level: 2, trend: 0, sessions: [1, 1, 2, 2, 2, 2] },
  { user: 'u-elsa', vals: [50, 30, 18, 8, 3, 1], level: 1, trend: -1, sessions: [1, 2, 1, 1, 1, 1] },
]

// 3 soal published untuk topik SPL — tiap opsi mewakili level Bloom berbeda,
// tidak ada jawaban salah: tiap opsi valid di kedalaman kognitifnya.
const seedQuestions = [
  {
    id: 'q-spl-1',
    workspace_id: 'w-1',
    created_by: 'u-guru',
    subject: 'Matematika',
    topic: TOPIC_SPL,
    type: 'mcq',
    bloom_target: ['C1', 'C2', 'C3', 'C4'],
    prompt:
      'Diketahui sistem persamaan 2x + y = 7 dan x − y = 2. Mana pendekatan yang paling menggambarkan caramu memandang masalah ini?',
    options: [
      {
        id: 'A', bloom: 'C1',
        text: 'Ini sistem persamaan linear dua variabel berbentuk ax + by = c.',
        indicator: 'Mengenali bentuk dan istilah dasar dari memori.',
        feedback: 'Kamu sudah mengenali bentuk dasarnya — fondasi yang penting. Coba lanjutkan dengan memikirkan apa makna solusinya.',
      },
      {
        id: 'B', bloom: 'C2',
        text: 'Solusinya adalah titik potong dua garis jika digambar pada bidang koordinat.',
        indicator: 'Menerjemahkan bentuk aljabar ke makna geometris.',
        feedback: 'Tepat — kamu memahami makna sistem ini, bukan sekadar bentuknya. Selanjutnya coba hitung titik potong itu.',
      },
      {
        id: 'C', bloom: 'C3',
        text: 'Jumlahkan kedua persamaan agar y tereliminasi, lalu x = 3 dan y = 1.',
        indicator: 'Menjalankan prosedur eliminasi sampai solusi ditemukan.',
        feedback: 'Kamu menerapkan eliminasi dengan tepat. Tantangan berikutnya: kapan substitusi lebih efisien daripada eliminasi?',
      },
      {
        id: 'D', bloom: 'C4',
        text: 'Koefisien y berlawanan tanda, jadi eliminasi sekali langkah lebih efisien daripada substitusi di sistem ini.',
        indicator: 'Menganalisis struktur sistem untuk memilih strategi.',
        feedback: 'Analisis strukturmu kuat — kamu memilih metode berdasarkan bentuk soal, ciri berpikir tingkat tinggi.',
      },
    ],
    rubric: null,
    published: true,
    created_at: '2026-06-01T08:00:00Z',
  },
  {
    id: 'q-spl-2',
    workspace_id: 'w-1',
    created_by: 'u-guru',
    subject: 'Matematika',
    topic: TOPIC_SPL,
    type: 'mcq',
    bloom_target: ['C2', 'C3', 'C4', 'C5'],
    prompt:
      'Harga 2 buku dan 3 pensil Rp19.000; harga 1 buku dan 2 pensil Rp11.000. Bagaimana kamu menanggapi situasi ini?',
    options: [
      {
        id: 'A', bloom: 'C2',
        text: 'Situasi ini bisa dimodelkan sebagai SPL: 2b + 3p = 19000 dan b + 2p = 11000.',
        indicator: 'Menerjemahkan cerita menjadi model matematika.',
        feedback: 'Memodelkan situasi nyata ke bentuk aljabar adalah inti pemahaman — kerja bagus. Coba selesaikan modelnya.',
      },
      {
        id: 'B', bloom: 'C3',
        text: 'Dari persamaan kedua, b = 11000 − 2p; substitusi menghasilkan harga pensil Rp3.000 dan buku Rp5.000.',
        indicator: 'Menerapkan substitusi pada model yang sudah ada.',
        feedback: 'Prosedur substitusimu rapi dan benar. Sekarang pikirkan: apakah jawaban itu masuk akal di dunia nyata?',
      },
      {
        id: 'C', bloom: 'C4',
        text: 'Perlu dicek dulu apakah kedua persamaan independen — jika kelipatan, sistem tak punya solusi tunggal.',
        indicator: 'Menguji struktur sistem sebelum menyelesaikannya.',
        feedback: 'Kamu menganalisis validitas sistem sebelum menghitung — kebiasaan matematikawan sesungguhnya.',
      },
      {
        id: 'D', bloom: 'C5',
        text: 'Model linear ini hanya valid bila harga satuan konstan; diskon grosir akan membuat model ini menyesatkan.',
        indicator: 'Mengevaluasi batas keberlakuan model terhadap konteks.',
        feedback: 'Evaluasi kritis terhadap asumsi model — level berpikir yang menyiapkanmu untuk mencipta model sendiri.',
      },
    ],
    rubric: null,
    published: true,
    created_at: '2026-06-02T08:00:00Z',
  },
  {
    id: 'q-spl-3',
    workspace_id: 'w-1',
    created_by: 'u-guru',
    subject: 'Matematika',
    topic: TOPIC_SPL,
    type: 'mcq',
    bloom_target: ['C3', 'C4', 'C5', 'C6'],
    prompt:
      'Sebuah SPL tiga variabel menghasilkan baris 0 = 0 saat dieliminasi. Bagaimana kamu menyikapinya?',
    options: [
      {
        id: 'A', bloom: 'C3',
        text: 'Lanjutkan eliminasi pada baris tersisa dan nyatakan satu variabel sebagai parameter.',
        indicator: 'Menjalankan prosedur lanjutan pada kasus khusus.',
        feedback: 'Kamu tahu prosedur untuk kasus ini — solusi parametrik. Coba renungkan mengapa baris nol bisa muncul.',
      },
      {
        id: 'B', bloom: 'C4',
        text: 'Baris 0 = 0 berarti salah satu persamaan kombinasi linear dari yang lain — sistemnya kekurangan informasi.',
        indicator: 'Menguraikan penyebab struktural dari hasil eliminasi.',
        feedback: 'Analisismu menyentuh konsep dependensi linear — fondasi menuju aljabar linear di perguruan tinggi.',
      },
      {
        id: 'C', bloom: 'C5',
        text: 'Solusi tunggal mustahil; klaim apa pun tentang satu jawaban pasti harus ditolak dan soal perlu data tambahan.',
        indicator: 'Menilai kesimpulan yang sah ditarik dari kondisi sistem.',
        feedback: 'Kamu mengevaluasi klaim dengan standar matematis — berani menolak jawaban tunggal adalah penalaran tingkat tinggi.',
      },
      {
        id: 'D', bloom: 'C6',
        text: 'Merancang soal cerita baru yang sengaja menghasilkan sistem dependen, untuk menguji pemahaman teman sekelas.',
        indicator: 'Mencipta artefak baru dari pemahaman struktur sistem.',
        feedback: 'Mencipta soal dari konsep adalah bukti penguasaan penuh — tawarkan soalmu ke guru untuk sesi kelas!',
      },
    ],
    rubric: null,
    published: true,
    created_at: '2026-06-03T08:00:00Z',
  },
]

function buildSeed() {
  const now = Date.now()
  const users = [
    { id: 'u-guru', email: 'ratna@sma3bdg.sch.id', password: 'guru123', full_name: 'Ratna Dewi, S.Pd.', role: 'guru' },
    { id: 'u-aisyah', email: 'aisyah@siswa.com', password: 'siswa123', full_name: 'Aisyah Putri', role: 'siswa' },
    { id: 'u-dimas', email: 'dimas@siswa.com', password: 'siswa123', full_name: 'Dimas Prasetyo', role: 'siswa' },
    { id: 'u-citra', email: 'citra@siswa.com', password: 'siswa123', full_name: 'Citra Maharani', role: 'siswa' },
    { id: 'u-bagas', email: 'bagas@siswa.com', password: 'siswa123', full_name: 'Bagas Saputra', role: 'siswa' },
    { id: 'u-elsa', email: 'elsa@siswa.com', password: 'siswa123', full_name: 'Elsa Ramadhani', role: 'siswa' },
  ]
  const workspaces = [
    {
      id: 'w-1', name: 'XI MIPA 2', school: 'SMA Negeri 3 Bandung', subject: 'Matematika',
      join_code: 'VSC-7QK2', created_by: 'u-guru', created_at: '2026-05-04T08:00:00Z',
    },
  ]
  const members = users.map((u) => ({
    workspace_id: 'w-1', user_id: u.id, role: u.role, joined_at: '2026-05-04T09:00:00Z',
  }))

  const bloom_profiles = seedProfiles.map((p) => ({
    id: uid(), user_id: p.user, workspace_id: 'w-1', topic: TOPIC_SPL,
    c1: p.vals[0], c2: p.vals[1], c3: p.vals[2], c4: p.vals[3], c5: p.vals[4], c6: p.vals[5],
    current_level: p.level, trend: p.trend, session_count: p.sessions.length,
    updated_at: new Date(now - 86400000).toISOString(),
  }))

  // Riwayat sesi → bahan trajektori kognitif
  const sessions = seedProfiles.flatMap((p) =>
    p.sessions.map((lvl, i) => ({
      id: uid(), workspace_id: 'w-1', user_id: p.user, topic: TOPIC_SPL, subject: 'Matematika',
      bloom_level: lvl, item_count: 6,
      started_at: new Date(now - (p.sessions.length - i) * 4 * 86400000).toISOString(),
      completed_at: new Date(now - (p.sessions.length - i) * 4 * 86400000 + 1500000).toISOString(),
    })),
  )

  return { users, workspaces, members, questions: seedQuestions, bloom_profiles, sessions, session_answers: [] }
}

export function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* seed ulang bila korup */ }
  const db = buildSeed()
  saveDB(db)
  return db
}

export function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function resetDB() {
  localStorage.removeItem(DB_KEY)
  return loadDB()
}

export const demoSession = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
  },
  set(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) },
  clear() { localStorage.removeItem(SESSION_KEY) },
}

export const newId = uid

// ---------------------------------------------------------------------------
// Generator soal mode demo — meniru output Edge Function `generate-questions`.
// Template per level Bloom dengan topik disisipkan, supaya demo tetap hidup
// tanpa API key Gemini.
// ---------------------------------------------------------------------------

const PROMPT_TMPL = [
  (t, s) => `Dalam ${s}, kamu dihadapkan pada persoalan tentang ${t}. Mana yang paling menggambarkan caramu mendekatinya?`,
  (t) => `Seorang temanmu kesulitan memahami ${t}. Respons mana yang paling mencerminkan caramu berpikir?`,
  (t) => `Perhatikan sebuah kasus nyata yang melibatkan ${t}. Bagaimana kamu menyikapinya?`,
  (t, s) => `Guru memberikan masalah terbuka seputar ${t} pada pelajaran ${s}. Langkah mana yang paling dekat dengan caramu?`,
  (t) => `Dalam diskusi kelompok tentang ${t}, kontribusi mana yang paling menggambarkan dirimu?`,
]

const OPTION_TMPL = {
  C1: {
    text: (t) => `Menyebutkan kembali definisi, istilah, dan bentuk dasar dari ${t}.`,
    indicator: 'Mengambil kembali fakta dan istilah dari memori.',
    feedback: 'Fondasi ingatanmu baik. Langkah berikutnya: coba jelaskan konsep ini dengan kata-katamu sendiri.',
  },
  C2: {
    text: (t) => `Menjelaskan konsep ${t} dengan kata-kata sendiri disertai sebuah contoh.`,
    indicator: 'Membangun makna dan menerjemahkan konsep ke bahasa sendiri.',
    feedback: 'Pemahamanmu terbentuk dengan baik. Tantang dirimu menerapkannya pada soal yang belum pernah kamu lihat.',
  },
  C3: {
    text: (t) => `Menerapkan langkah penyelesaian ${t} secara runtut pada kasus serupa.`,
    indicator: 'Menggunakan prosedur pada situasi yang dikenal.',
    feedback: 'Penerapan prosedurmu tepat. Berikutnya, coba bandingkan beberapa cara dan temukan pola di baliknya.',
  },
  C4: {
    text: (t) => `Menguraikan komponen masalah ${t} dan menunjukkan hubungan antar bagiannya.`,
    indicator: 'Mengurai struktur masalah dan relasi antar elemen.',
    feedback: 'Analisismu tajam — kamu melihat struktur, bukan hanya langkah. Coba nilai strategi mana yang paling efisien.',
  },
  C5: {
    text: (t) => `Menilai pendekatan mana yang paling tepat untuk ${t} ini beserta alasannya.`,
    indicator: 'Membuat penilaian berdasarkan kriteria yang jelas.',
    feedback: 'Evaluasimu berbasis kriteria — ciri pemikir kritis. Satu langkah lagi menuju mencipta karya sendiri.',
  },
  C6: {
    text: (t) => `Merancang masalah atau model baru tentang ${t} dari konteks kehidupan sehari-hari.`,
    indicator: 'Menggabungkan elemen menjadi karya baru yang orisinal.',
    feedback: 'Kamu berada di puncak taksonomi — mencipta. Bagikan rancanganmu agar teman lain ikut belajar darinya.',
  },
}

const OPTION_IDS = ['A', 'B', 'C', 'D']

// 4 level berurutan yang berakhir di sekitar target/max
function levelWindow(maxCode) {
  const max = Math.max(4, levelOf(maxCode))
  const start = max - 3
  return [0, 1, 2, 3].map((i) => codeOf(start + i))
}

export function demoGenerateQuestions({ subject, topic, type, count, maxBloom, workspaceId, createdBy }) {
  const n = Math.min(15, Math.max(1, count || 1))
  return Array.from({ length: n }, (_, i) => {
    if (type === 'essay') {
      return {
        id: newId(),
        workspace_id: workspaceId, created_by: createdBy, subject, topic,
        type: 'essay',
        bloom_target: ['C2', 'C3', 'C4', 'C5'],
        prompt: `Uraikan sebuah situasi nyata di sekitarmu yang dapat dimodelkan dengan ${topic}. Jelaskan modelnya, selesaikan, lalu nilai sejauh mana model itu masuk akal.`,
        options: null,
        rubric: [
          { bloom: 'C2', desc: `Menjelaskan konsep ${topic} dengan bahasa sendiri secara akurat.` },
          { bloom: 'C3', desc: `Menerapkan prosedur ${topic} dengan langkah yang runtut dan benar.` },
          { bloom: 'C4', desc: 'Menguraikan hubungan antar komponen situasi dan modelnya.' },
          { bloom: 'C5', desc: 'Menilai keterbatasan model dan mengusulkan perbaikan dengan argumen.' },
        ],
        published: false,
        created_at: new Date().toISOString(),
      }
    }
    const levels = levelWindow(maxBloom)
    return {
      id: newId(),
      workspace_id: workspaceId, created_by: createdBy, subject, topic,
      type: 'mcq',
      bloom_target: levels,
      prompt: PROMPT_TMPL[i % PROMPT_TMPL.length](topic, subject),
      options: levels.map((code, j) => ({
        id: OPTION_IDS[j],
        bloom: code,
        text: OPTION_TMPL[code].text(topic),
        indicator: OPTION_TMPL[code].indicator,
        feedback: OPTION_TMPL[code].feedback,
      })),
      rubric: null,
      published: false,
      created_at: new Date().toISOString(),
    }
  })
}

// Soal on-the-fly untuk sesi adaptif: jendela level memuat target di posisi ke-2/3
export function demoAdaptiveQuestion({ topic, subject, target }) {
  const t = levelOf(target)
  const start = Math.min(3, Math.max(1, t - 1))
  const levels = [0, 1, 2, 3].map((i) => codeOf(start + i))
  const q = demoGenerateQuestions({
    subject: subject || 'Matematika', topic, type: 'mcq', count: 1,
    maxBloom: levels[3], workspaceId: 'w-1', createdBy: 'ai',
  })[0]
  q.bloom_target = levels
  q.options = levels.map((code, j) => ({
    id: OPTION_IDS[j],
    bloom: code,
    text: OPTION_TMPL[code].text(topic),
    indicator: OPTION_TMPL[code].indicator,
    feedback: OPTION_TMPL[code].feedback,
  }))
  return q
}

// ---------------------------------------------------------------------------
// Perhitungan profil Bloom — dipakai mode demo & sebagai referensi Edge Function
// `update-bloom-profile`. Mastery lama dicampur bukti sesi terbaru (60/40).
// ---------------------------------------------------------------------------
export function computeProfileUpdate(oldProfile, answers) {
  const counts = answers.length || 1
  const next = { ...oldProfile }
  BLOOM_LEVELS.forEach((code, idx) => {
    const evidence =
      answers.filter((a) => levelOf(a.bloom_chosen) >= idx + 1).length / counts
    const key = code.toLowerCase()
    const prev = oldProfile?.[key] ?? 0
    next[key] = Math.round(prev * 0.6 + evidence * 100 * 0.4)
  })
  let level = 1
  BLOOM_LEVELS.forEach((code, idx) => {
    if (next[code.toLowerCase()] >= 60) level = idx + 1
  })
  const prevLevel = oldProfile?.current_level ?? 1
  next.current_level = level
  next.trend = Math.sign(level - prevLevel)
  next.session_count = (oldProfile?.session_count ?? 0) + 1
  next.updated_at = new Date().toISOString()
  return next
}

export { BLOOM, TOPIC_SPL }
