# VSmartClass — Developer Handoff Prompt
## untuk Claude (coding assistant) · React + Vite + Supabase

---

## KONTEKS PROYEK

Kamu adalah senior fullstack developer yang akan membangun **VSmartClass** —
platform Collaborative Workspace bertenaga AI untuk pembelajaran adaptif
berbasis **Taksonomi Bloom (C1–C6)**.

Proyek ini adalah karya lomba **LIDM 2026** (Lomba Inovasi Digital Mahasiswa),
divisi Inovasi Teknologi Digital Pendidikan. Prioritas: **inovatif, jelas,
fungsional**, dengan UX yang ramah untuk guru SMA dan siswa SMA.

**Referensi desain:** prototipe HTML lengkap sudah tersedia sebagai acuan
visual dan logika interaksi. Ikuti desain itu sepenuhnya — warna, tipografi,
komponen, alur, dan copywriting.

---

## TECH STACK

```
Frontend  : React 18 + Vite 5
Styling   : Tailwind CSS v3  (atau CSS Modules jika lebih cocok)
State     : Zustand (global) + React Query (server state)
Router    : React Router v6
Backend   : Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
AI        : Google Gemini 1.5 Flash via Supabase Edge Function
Charts    : Recharts (RadarChart, BarChart, LineChart)
Icons     : Lucide React (line-art, konsisten — JANGAN pakai emoji di UI)
Fonts     : Plus Jakarta Sans (utama), Space Mono (monospace kode/label)
Deploy    : Vercel (frontend) + Supabase (backend)
```

---

## DESIGN TOKENS (ikuti persis)

```css
/* Warna — teal primary, warm accent, Bloom heat scale */
--accent:     #0d9488;
--accent-600: #0b7d72;
--warm:       #f2994a;

/* Bloom C1–C6 (JANGAN ubah — dipakai di seluruh app) */
--c1: #5b8def;  /* Mengingat   */
--c2: #18b1ad;  /* Memahami    */
--c3: #3fae6a;  /* Menerapkan  */
--c4: #e6b13c;  /* Menganalisis */
--c5: #e8803a;  /* Mengevaluasi */
--c6: #d9536a;  /* Mencipta    */

/* Neutrals */
--bg: #f6f7f6;  surface: #ffffff;  text: #1c2b29;

/* Radius */
--r-sm: 8px;  --r-md: 13px;  --r-lg: 18px;  --r-pill: 999px;

/* Dark mode: ada — flag di user preferences */
```

Typography: `font-weight: 800` untuk semua judul, `letter-spacing: -0.02em`.
Cards: `border: 1px solid #e2e8e6`, `box-shadow: 0 4px 16px -4px rgba(0,0,0,.12)`.

---

## ROLES & AUTH

Dua peran: **GURU** dan **SISWA**. Supabase Auth (email/password).

```sql
-- users table (extends auth.users)
profiles (
  id          uuid references auth.users primary key,
  full_name   text,
  role        text check (role in ('guru', 'siswa')),
  avatar_url  text,
  created_at  timestamptz default now()
)
```

Setelah sign-in, cek `profiles.role` → redirect ke `/guru/dashboard` atau `/siswa/beranda`.

---

## DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- Workspace / kelas
workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,           -- "XI MIPA 2"
  school      text,
  join_code   text unique,             -- "VSC-7QK2"
  created_by  uuid references profiles(id),
  subject     text,
  created_at  timestamptz default now()
)

workspace_members (
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references profiles(id),
  role          text check (role in ('guru', 'siswa')),
  joined_at     timestamptz default now(),
  primary key (workspace_id, user_id)
)

-- Soal (dibuat AI, berlabel Bloom)
questions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id),
  created_by    uuid references profiles(id),
  subject       text,
  topic         text,
  type          text check (type in ('mcq', 'essay')),
  bloom_target  text[],               -- ["C1","C2","C3","C4"]
  prompt        text not null,
  options       jsonb,                -- array of {id, text, bloom, feedback}
  rubric        jsonb,                -- essay only: array of {bloom, desc}
  published     bool default false,
  created_at    timestamptz default now()
)

-- Sesi belajar siswa
sessions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id),
  user_id       uuid references profiles(id),
  topic         text,
  subject       text,
  bloom_level   int check (bloom_level between 1 and 6),  -- level saat selesai
  started_at    timestamptz default now(),
  completed_at  timestamptz,
  item_count    int default 0
)

-- Jawaban per soal dalam sesi
session_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references sessions(id) on delete cascade,
  question_id   uuid references questions(id),
  chosen_option text,                 -- "A","B","C","D"
  bloom_chosen  text,                 -- "C3"
  bloom_target  text,                 -- "C3" (target soal ini)
  answered_at   timestamptz default now()
)

-- Profil Bloom per siswa per topik (di-upsert setiap sesi selesai)
bloom_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id),
  workspace_id  uuid references workspaces(id),
  topic         text,
  c1            int default 0,        -- mastery 0–100
  c2            int default 0,
  c3            int default 0,
  c4            int default 0,
  c5            int default 0,
  c6            int default 0,
  current_level int default 1,
  trend         int default 0,        -- -1 | 0 | 1
  session_count int default 0,
  updated_at    timestamptz default now(),
  unique (user_id, workspace_id, topic)
)
```

**Row Level Security:**
- `workspaces`: baca hanya anggota; insert hanya guru.
- `questions`: guru CRUD milik sendiri; siswa baca published=true di workspace-nya.
- `sessions` & `session_answers`: user hanya baca/tulis milik sendiri.
- `bloom_profiles`: guru baca semua anggota workspace-nya; siswa baca milik sendiri.

---

## FITUR & LAYAR — spesifikasi per modul

### MODUL 1 — Manajemen Workspace

**Guru:**
- Buat workspace → set nama, sekolah, mapel → dapat `join_code` 6-digit acak.
- Lihat daftar anggota + bloom level terkini masing-masing.
- Hapus / nonaktifkan anggota.

**Siswa:**
- Masuk workspace dengan `join_code`.
- Lihat workspace yang diikuti.

---

### MODUL 2 — Smart Question Generator (AI)

**UI (guru):**

Form parameter:
- Mata pelajaran (dropdown: Matematika, Fisika, Biologi, Sejarah, Ekonomi + free-text)
- Topik (text input)
- Jenjang (X / XI / XII)
- Tipe soal (Pilihan Ganda / Esai) — segmented control
- Jumlah soal: 1–15 (slider)
- Target Bloom maksimum: bar tombol C1–C6 (klik = set max, semua ≤ max highlight)

Tombol **"Generate dengan AI"** → loading shimmer (3 baris skeleton + spinner) → tampil hasil.

**Hasil PG (per soal):**
```
Pertanyaan (teks soal)
└─ Opsi A  [badge C1]  teks opsi  /  indikator kognitif  /  feedback formatif
└─ Opsi B  [badge C2]  ...
└─ Opsi C  [badge C3]  ...
└─ Opsi D  [badge C4]  ...
```
Setiap opsi punya border-left berwarna bloom-level-nya.
Tombol "Publikasikan ke kelas" dan "Tinjau & edit".

**Hasil Esai:**
Pertanyaan + rubrik berlabel Bloom (C2, C3, C4, C5 masing-masing satu kriteria).

**Edge Function: `generate-questions`**

```typescript
// supabase/functions/generate-questions/index.ts
// Input: { subject, topic, grade, type, count, maxBloom }
// Output: { questions: Question[] }

const systemPrompt = `
Kamu adalah asisten pendidik berbasis Taksonomi Bloom Revisi Anderson & Krathwohl.

Tugas: buat ${count} soal ${type === 'mcq' ? 'Pilihan Ganda' : 'Esai'} untuk mapel
${subject}, topik "${topic}", jenjang SMA kelas ${grade}.

Untuk Pilihan Ganda:
- Setiap soal punya 4 opsi (A–D).
- Setiap opsi HARUS mewakili level Bloom yang BERBEDA (C1 s.d. maks C${maxBloom}).
- Urutkan opsi dari level terendah ke tertinggi.
- Setiap opsi punya: text (jawaban), bloom (C1/C2/C3/C4), indicator (1 kalimat
  deskripsi proses kognitif yang terjadi), feedback (1–2 kalimat formatif untuk siswa).
- Tidak ada "opsi benar" tunggal — semua opsi valid di level-nya masing-masing.

Untuk Esai:
- 1 soal terbuka yang bisa dijawab di berbagai kedalaman kognitif.
- Rubrik: 4 kriteria masing-masing untuk C2, C3, C4, C5.

Output: JSON murni, tidak ada teks lain di luar JSON.
Schema MCQ:
{
  "questions": [{
    "prompt": "...",
    "type": "mcq",
    "bloomTarget": ["C1","C2","C3","C4"],
    "options": [{ "id":"A","text":"...","bloom":"C1","indicator":"...","feedback":"..." }]
  }]
}
`
```

Simpan hasil ke tabel `questions` (published=false awalnya).
Regenerate = panggil Edge Function baru, replace baris lama.

---

### MODUL 3 — Sesi Soal Adaptif (Siswa)

**Alur:**

```
1. Siswa buka topik → mulai sesi → target awal = C2
2. Tampil soal (MCQ berlabel Bloom)
3. Siswa pilih opsi → tampil feedback instan per opsi
4. Sistem hitung next target:
     if chosen_bloom_level >= target_level → next_target = chosen_level + 1 (maks C6)
     else                                 → next_target = chosen_level (tetap/turun)
5. Loader "AI menyesuaikan soal…" (1.5 dtk simulasi) + info adaptasi
6. Ambil soal berikutnya dari bank soal sesuai target, atau generate on-the-fly
7. Ulangi sampai 5–10 soal
8. Layar ringkasan: bar chart bloom snapshot sesi, bloom level dicapai, CTA → Lihat Profil
9. Update bloom_profiles di Supabase
```

**State machine sesi (Zustand):**
```typescript
type Phase = 'idle' | 'question' | 'feedback' | 'generating' | 'done'
interface SessionState {
  sessionId: string | null
  items: Question[]
  currentIdx: number
  phase: Phase
  picked: Option | null
  target: BloomLevel          // "C1"–"C6"
  answers: Answer[]
  startSession: (workspaceId, topic) => void
  choose: (option) => void
  next: () => void
}
```

**Komponen UI sesi:**
- `ProgressDots` — dots melebar untuk current (lihat prototipe)
- Soal: card dengan `target badge` di header
- Opsi: border 2px (default: var(--border)), saat dipilih: border+background bloom color
- Feedback: card berwarna soft bloom terpilih, badge level, teks feedback
- Tombol "Soal berikutnya →" / "Selesaikan sesi →"

---

### MODUL 4 — Rekomendasi Personal

**Untuk Guru — berbasis distribusi kelas:**

Mapping otomatis dari `bloom_profiles`:
```
Mayoritas C1–C2 → Direct Instruction (demonstrasi visual, analogi)
Tersebar C2–C3  → Cooperative Learning (Think-Pair-Share)
Sudah C3–C4     → Problem-Based Learning (Socratic questioning)
Sebagian C5–C6  → Project Exhibition (peer teaching)
```
Tampilkan sebagai 4 card dengan border-top berwarna bloom level, metode sebagai chip.

**Untuk Siswa — berbasis bloom_profile individu:**
- Identifikasi level terlemah (nilai terendah di profil radar).
- Generate 3 rekomendasi: 1 penguatan level saat ini + 2 untuk naik level.
- Tampil sebagai card: bloom badge, judul aktivitas, alasan (mengapa cocok untuk siswa ini), tipe (Visual/Latihan/Penguatan) + estimasi waktu.
- CTA card C6 "Tantangan Mencipta" di bagian bawah.

---

### MODUL 5 — Bloom Analytics Dashboard (Guru)

**4 visualisasi utama:**

**a. Stat Cards (4 kartu di atas)**
```
Soal dibuat AI minggu ini  |  Siswa naik ≥1 level  |  Perlu perhatian  |  Rata-rata kelas
```
Data dari query Supabase aggregasi.

**b. Bloom Class Heatmap**
Grid: baris = topik, kolom = C1–C6, sel = % siswa di level itu.
Warna sel = bloom color dengan opacity proporsional ke % (rendah = pudar, tinggi = solid).
Angka di dalam sel. Hover scale(1.06).

Implementasi dengan Recharts atau CSS grid murni (ikuti prototipe — bukan library chart).

**c. Trajektori kognitif siswa (line chart)**
X: sesi 1–N, Y: bloom level 1–6.
Selector siswa (dropdown) di header panel.
Area fill gradient (teal, opacity rendah).
Setiap titik: lingkaran warna bloom-level-nya.
Y-axis label: C1–C6 berwarna.

Recharts `ComposedChart` + `Area` + `Line` + `ScatterChart` custom, **atau** SVG murni (gunakan kode prototipe sebagai referensi).

**d. Growth stacked bars**
X: Minggu 1–4, Y: stacked 100% (distribusi bloom).
Warna tiap segmen = bloom color.

**e. Radar chart (profil siswa individual)**
6 sumbu = C1–C6, nilai 0–100 per sumbu.
Recharts `RadarChart` + `Radar`.

**f. Tabel aktivitas kelas**
Kolom: Nama, Bloom Level (chip), Tren (▲/▼/—), Sesi, Status.
Status chip: "On-track" (c3), "Plateau" (c4), "Perlu perhatian" (c6).

**Realtime:** Gunakan `supabase.channel('bloom-updates').on('postgres_changes', ...)` untuk update heatmap & stat cards live saat siswa menyelesaikan sesi.

---

## KOMPONEN SHARED

Buat semua ini sebagai komponen reusable di `src/components/bloom/`:

```
BloomBadge     — pill "C3" berwarna (size: sm/md/lg, soft mode)
BloomChip      — dot + "C3 · Menerapkan"  
BloomDot       — dot kecil warna bloom
BloomLegend    — baris C1–C6 dengan dot + label
BloomLadder    — stack vertikal C1..C6, highlight current, dashed border target
```

Dan di `src/components/ui/`:
```
Panel          — card dengan header (title, subtitle, action slot) + body
StatCard       — metric card dengan left-border accent, value besar
Avatar         — lingkaran inisial, warna deterministik dari nama
Segmented      — pill segmented control (dipakai di role switch, tipe soal, dll)
StatusTag      — on-track / plateau / perlu perhatian
AIThinking     — spinner + shimmer skeleton (saat generate soal / soal berikutnya)
ProgressDots   — dot progress (current = melebar jadi batang)
```

---

## NAVIGASI & ROUTING

```
/                     → redirect ke /masuk

/masuk                → halaman login (email+password)
/daftar               → halaman register (nama, email, password, role)

/guru/                → layout guru (sidebar desktop, bottom tab mobile)
  dashboard           → TeacherDashboard
  soal/baru           → QuestionGenerator
  soal/:id            → edit/preview soal
  analitik            → TeacherAnalytics
  rekomendasi         → TeacherRecommendations
  kelas/:id           → detail workspace

/siswa/               → layout siswa (sidebar/bottom tab)
  beranda             → StudentHome
  sesi/:topic         → StudentSession (alur soal adaptif)
  profil              → StudentProfile (radar + ladder + trajektori)
  rekomendasi         → StudentRecs

/bergabung/:code      → landing join workspace (untuk siswa pakai kode)
```

Protected routes: cek `profiles.role` → redirect bila role salah.

---

## STRUKTUR FOLDER

```
src/
├── components/
│   ├── bloom/         BloomBadge, BloomChip, BloomLadder, BloomLegend, RadarChart, …
│   ├── charts/        ClassHeatmap, TrajectoryChart, GrowthBars
│   └── ui/            Panel, StatCard, Avatar, Segmented, StatusTag, AIThinking, …
├── pages/
│   ├── auth/          Login, Register
│   ├── guru/          Dashboard, QuestionGenerator, Analytics, Recommendations
│   └── siswa/         Home, Session, Profile, Recommendations
├── stores/
│   ├── session.ts     Zustand — alur soal adaptif
│   └── workspace.ts   Zustand — kelas aktif
├── hooks/
│   ├── useBloomProfile.ts   React Query → bloom_profiles
│   ├── useClassData.ts      React Query → heatmap, stats, roster
│   └── useRealtime.ts       Supabase Realtime subscription
├── lib/
│   ├── supabase.ts    createClient
│   ├── gemini.ts      helper panggil Edge Function
│   └── bloom.ts       konstanta Bloom (nama, warna, deskripsi, metode)
├── types/
│   └── index.ts       interface DB rows + app types
└── styles/
    └── tokens.css     CSS custom properties (ikuti design tokens di atas)
```

---

## SUPABASE EDGE FUNCTIONS

### `generate-questions`
Input: `{ subject, topic, grade, type, count, maxBloom, workspaceId }`
Output: array questions (sesuai schema di atas)
- Panggil Gemini 1.5 Flash API
- Parse JSON response
- Insert ke tabel `questions` (published=false)
- Return questions

### `get-recommendations`
Input: `{ userId, workspaceId, topic }`
Output: `{ studentRecs, strategy }`
- Baca `bloom_profiles` user
- Hitung weakest level
- Generate 3 rekomendasi via prompt singkat ke Gemini
- Return structured JSON

### `update-bloom-profile`
Input: `{ sessionId }` — dipanggil saat sesi selesai
- Baca semua `session_answers` dalam sesi itu
- Hitung distribusi bloom + average level + trend vs sesi sebelumnya
- Upsert ke `bloom_profiles`

---

## ENVIRONMENT VARIABLES

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# di Supabase Edge Function secrets:
GEMINI_API_KEY=...
```

---

## CONTOH DATA DUMMY (untuk development)

Seed script:
- 1 workspace "XI MIPA 2 · SMA Negeri 3 Bandung" (join_code: VSC-7QK2)
- 1 akun guru: ratna@sma3bdg.sch.id / guru123
- 5 akun siswa: aisyah@siswa.com, dimas@siswa.com, citra@siswa.com, bagas@siswa.com, elsa@siswa.com / siswa123
- bloom_profiles pre-filled untuk mapel Matematika, topik "Sistem Persamaan Linear"
  - Aisyah: [92,84,71,60,22,10] level 4
  - Dimas:  [88,75,60,48,20,8]  level 3
  - Citra:  [95,90,85,70,50,30] level 5
  - Bagas:  [70,55,40,20,8,2]   level 2
  - Elsa:   [50,30,18,8,3,1]    level 1  (perlu perhatian)
- 3 questions published=true (MCQ) untuk topik yang sama

---

## UX RULES WAJIB

1. **Tidak ada emoji di UI** — gunakan Lucide React icons.
2. **Bloom color = selalu gunakan token --c1 s.d. --c6** — jangan hardcode hex.
3. **Feedback sesi = selalu tampil** setelah siswa memilih, sebelum soal berikutnya.
4. **"Tidak ada jawaban salah"** — copy ini harus muncul di session screen.
5. **Loading states**: AI generate soal → shimmer skeleton (bukan spinner kosong).
6. **Dark mode**: simpan preferensi di `profiles` tabel + localStorage fallback.
7. **Responsive**: breakpoint 768px — di bawahnya: bottom tab navigation, layout single-column.
8. **Realtime heatmap**: guru melihat update live saat siswa submit jawaban.
9. **Logo**: gunakan file `logo.png` (putih transparan) di dalam badge gradien `linear-gradient(135deg, #0d9488, #e8803a)` — jangan tampilkan telanjang di latar putih.
10. **Font**: Plus Jakarta Sans — pastikan font-weight 800 untuk semua heading.

---

## PRIORITAS BUILD (urutan pengerjaan)

```
Fase 1 (MVP)
  ✓ Auth (login, register, role redirect)
  ✓ Workspace (buat, join, daftar anggota)
  ✓ Smart Question Generator (form → Edge Fn Gemini → tampil soal berlabel Bloom)
  ✓ Adaptive Session (soal adaptif, feedback, update bloom profile)

Fase 2
  ✓ Bloom Analytics (heatmap, radar, trajektori)
  ✓ Rekomendasi guru & siswa
  ✓ Realtime update heatmap via Supabase channel

Fase 3
  ✓ Dark mode, density preference
  ✓ Edit/publish soal
  ✓ Export laporan (PDF per siswa)
```

---

**Mulai dari:** setup Vite + Supabase + seed data + Auth flow, lalu Modul 2 (Generator) karena itu fitur paling inovatif dan impresif untuk demo LIDM.
