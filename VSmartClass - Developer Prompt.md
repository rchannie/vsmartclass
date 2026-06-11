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

## LANDASAN TEORI

VSmartClass dibangun di atas lima teori pendidikan yang telah divalidasi secara empiris.
Setiap fitur utama aplikasi berakar pada salah satu atau kombinasi teori berikut.

### 1. Taksonomi Bloom Revisi (Anderson & Krathwohl, 2001)
> Anderson, L.W., & Krathwohl, D.R. (Eds.). (2001). *A Taxonomy for Learning,
> Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives*.
> New York: Longman.

Revisi Krathwohl mengubah kata benda (Knowledge → Evaluate) menjadi kata kerja (C1
Mengingat → C6 Mencipta) dan memperkenalkan dimensi proses kognitif yang lebih eksplisit.
**Implementasi di VSmartClass:** setiap soal diberi label C1–C6; profil mastery siswa
direpresentasikan sebagai vektor 6 dimensi; sesi adaptif menaiki level satu demi satu
dengan threshold `consecutive_success ≥ 2` sebelum naik.

### 2. Zone of Proximal Development / ZPD (Vygotsky, 1978)
> Vygotsky, L.S. (1978). *Mind in Society: The Development of Higher Psychological
> Processes*. Cambridge, MA: Harvard University Press.

ZPD mendefinisikan rentang antara apa yang dapat dikerjakan siswa sendiri dan apa yang
bisa dicapai dengan bantuan. Scaffolding mengisi celah ini. **Implementasi di VSmartClass:**
rekomendasi aktivitas selalu menyasar level *terlemah + 1* (bukan langsung melompat ke C6);
feedback formatif pada setiap soal berperan sebagai scaffolding instan.

### 3. Gaya Belajar VARK (Fleming & Mills, 1992)
> Fleming, N.D., & Mills, C. (1992). Not another inventory, rather a catalyst for
> reflection. *To Improve the Academy*, 11, 137–155.

Model VARK mengklasifikasikan preferensi belajar menjadi Visual, Auditori, Baca-Tulis
(Read/Write), dan Kinestetik. **Implementasi di VSmartClass:** survei 4 pertanyaan pada
onboarding siswa menyimpan `vark_style` di tabel `profiles`; Edge Function
`get-recommendations` meneruskan profil VARK ke Gemini agar judul dan metode aktivitas
disesuaikan dengan gaya belajar dominan siswa.

### 4. Direct Instruction (Rosenshine, 2012)
> Rosenshine, B. (2012). Principles of instruction: Research-based strategies that all
> teachers should know. *American Educator*, 36(1), 12–39.

Direct Instruction menekankan penjelasan eksplisit, demonstrasi bertahap, dan latihan
terbimbing sebelum latihan mandiri. **Implementasi di VSmartClass:** dipetakan ke level
C1–C2 sebagai strategi default; Gemini menghasilkan soal recall dan pemahaman yang
cocok untuk tahap penguatan awal.

### 5. Cooperative Learning (Johnson, Johnson & Holubec, 1994)
> Johnson, D.W., Johnson, R.T., & Holubec, E.J. (1994). *Cooperative Learning in the
> Classroom*. Alexandria, VA: ASCD.

Pembelajaran kooperatif meningkatkan penguasaan melalui interaksi terstruktur antar
teman sebaya. **Implementasi di VSmartClass:** dipetakan ke level C3 sebagai strategi
transisi dari pemahaman ke penerapan; rekomendasi guru di halaman Rekomendasi menyarankan
metode diskusi kelompok untuk siswa plateau.

### 6. Problem-Based Learning / PBL (Hmelo-Silver, 2004)
> Hmelo-Silver, C.E. (2004). Problem-based learning: What and how do students learn?
> *Educational Psychology Review*, 16(3), 235–266.

PBL menyajikan masalah nyata yang kompleks sebagai titik masuk pembelajaran, mendorong
pemikiran kritis tingkat tinggi. **Implementasi di VSmartClass:** dipetakan ke level C4;
soal esai dengan rubrik Bloom C4–C5 dirancang sebagai mini-PBL problem. Rekomendasi
siswa di level C4 mengarahkan ke latihan analisis berbasis kasus.

### 7. Project Exhibition / Project-Based Learning (Krajcik & Shin, 2014)
> Krajcik, J., & Shin, N. (2014). Project-based learning. In R.K. Sawyer (Ed.),
> *The Cambridge Handbook of the Learning Sciences* (2nd ed., pp. 275–297).
> Cambridge University Press.

Proyek akhir sebagai artefak nyata (exhibit) merupakan bukti penguasaan C6 (Mencipta).
**Implementasi di VSmartClass:** fitur `ProjectSubmit` memungkinkan siswa mengumpulkan
laporan proyek mini; guru melihat daftar submission di halaman Rekomendasi Guru sebagai
bukti pencapaian C6.

---

### Tabel Pemetaan Teori → Fitur

| Teori | Level Bloom | Komponen / Fitur |
|---|---|---|
| Taksonomi Bloom Revisi | C1–C6 | Semua soal, bloom_profiles, adaptasi level |
| ZPD Vygotsky | +1 dari posisi saat ini | Adaptive session, rec target level |
| VARK Fleming & Mills | — | `VarkSurvey`, parameter prompt Gemini |
| Direct Instruction Rosenshine | C1–C2 | Strategi default soal recall/pemahaman |
| Cooperative Learning Johnson | C3 | Saran diskusi kelompok, strategi rekomendasi |
| Problem-Based Learning Hmelo-Silver | C4 | Soal esai analitis, rec aktivitas kasus |
| Project Exhibition Krajcik & Shin | C6 | `ProjectSubmit`, submission list guru |

---

## TECH STACK

```
Frontend  : React 18 + Vite 5
Styling   : Tailwind CSS v3  (atau CSS Modules jika lebih cocok)
State     : Zustand (global) + React Query (server state)
Router    : React Router v6
Backend   : Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
AI        : Google Gemini 2.5 Flash via Supabase Edge Function
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
  options       jsonb,                -- array of {id, text, bloom, indicator, feedback}
  rubric        jsonb,                -- essay only: array of {bloom, desc}
  published     bool default false,
  -- difficulty_tier: DERIVED (tidak disimpan) — dihitung dari bloom_target tertinggi
  --   max C1–C2 → "Dasar" · max C3–C4 → "Menengah" · max C5–C6 → "Lanjut"
  --   fungsi: difficultyTierOf(bloom_target) di src/lib/bloom.js
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
Pertanyaan + rubrik berlabel Bloom (C2, C3, C4, C5 — empat kriteria; C1 dan C6 tidak
disertakan karena C1 terlalu sederhana untuk rubrik esai dan C6 di luar jangkauan umum).

**Edge Function: `generate-questions`**

Zero-shot prompt — tidak ada few-shot examples. Instruksi Bloom + JSON schema sudah cukup
untuk Gemini 2.5 Flash menghasilkan soal berkualitas tinggi secara konsisten.

```typescript
// supabase/functions/generate-questions/index.ts
// Input : { subject, topic, grade, type, count, maxBloom, workspaceId }
// Output: { questions: Question[] }  — sudah di-insert ke DB (published=false)

// Prompt meminta JSON murni dengan schema:
// MCQ:
{
  "questions": [{
    "prompt": "...",
    "type": "mcq",
    "bloomTarget": ["C1","C2","C3","C4"],
    "options": [{ "id":"A","text":"...","bloom":"C1","indicator":"...","feedback":"..." }],
    "rubric": null
  }]
}
// Essay:
{
  "questions": [{
    "prompt": "...",
    "type": "essay",
    "bloomTarget": ["C2","C3","C4","C5"],
    "options": null,
    "rubric": [{ "bloom":"C2","desc":"..." }, ...]
  }]
}
```

Soal disimpan ke tabel `questions` (published=false). Guru meninjau lalu publish ke kelas.
Regenerate = panggil Edge Function baru; soal lama tetap di DB sampai guru hapus manual.

---

### MODUL 3 — Sesi Soal Adaptif (Siswa)

**Dua dimensi adaptasi yang bekerja bersama:**

1. **Dimensi topik** — guru menentukan topik yang dipublikasikan ke kelas; siswa mengerjakan topik yang diberikan guru. Rekomendasi personal (Modul 4) memandu siswa fokus ke topik terlemah mereka, sehingga pemilihan topik bersifat guru-driven dan recommendation-driven, bukan otomatis oleh engine sesi.
2. **Dimensi level Bloom** — engine sesi menentukan target level soal berikutnya secara real-time (intra-session) dan antar-sesi (inter-session).

**Alur intra-sesi (per soal):**

```
1. Siswa buka topik
   - Sesi pertama topik ini (isDiagnostic=true)  → target awal C3 ("Kalibrasi Awal")
   - Sesi berikutnya (isDiagnostic=false)         → target awal = level profil terakhir
2. Tampil soal dari bank soal (guru sudah generate + publish sebelumnya)
   - Soal MCQ: siswa pilih opsi → bloom_chosen = opt.bloom (langsung diketahui)
   - Soal Esai: siswa ketik jawaban → dikirim ke Edge Function evaluate-essay → 
     Gemini menilai → bloom_level_achieved + feedback konstruktif + follow-up prompt
3. Jawaban disimpan atomik ke session_answers (Supabase Edge Function)
4. Saat siswa baca feedback, sistem pre-fetch soal N+1 di background
5. Sistem hitung next target (consecutive-success):
     chosen >= target, streak < 2  →  next = target          [bangun streak]
     chosen >= target, streak ≥ 2  →  next = target + 1      [naik, streak reset]
     chosen <  target               →  next = chosen, streak=0 [turun/reset + scaffolding tip]
   → Target C6: soal ditampilkan sebagai "Tantangan Mencipta" (proyek mini)
6. Loader "AI menyesuaikan soal…" (1.5 dtk, atau 0.6 dtk bila soal sudah di-prefetch)
7. Tampil soal berikutnya dari bank sesuai target baru
8. Ulangi sampai 6 soal (SESSION_LENGTH)
9. finalLevel = modus level yang dipilih (mode, bukan MAX — mencegah inflasi)
10. Layar ringkasan: bar chart bloom snapshot sesi, bloom level, CTA → Lihat Profil
11. Upsert bloom_profiles di Supabase (final — increment session_count + trend)
```

**Adaptasi antar-sesi (inter-session) — blend 60/40:**
`bloom_profiles` diperbarui tiap sesi selesai menggunakan weighted blend:
```
mastery_baru = mastery_lama × 0.6 + bukti_sesi_ini × 100 × 0.4
level naik jika mastery_C{n} ≥ 60%
```
Ini ekuivalen dengan aturan "2 sesi berturut-turut": setelah sesi pertama di C3 (mastery=40%), baru setelah sesi kedua konsisten (mastery=64%) level resmi naik ke C3 dan sesi berikutnya menargetkan C4. Performa tidak konsisten otomatis memperlambat kenaikan.

> **Bank soal per level**: guru generate soal ke bank (published=true), sesi siswa mengambil
> dari bank sesuai `target` level. Fallback: jika bank kosong untuk target tertentu, Edge
> Function generate-questions dipanggil on-demand dengan `adaptive: true`.

**State machine sesi (Zustand):**
```typescript
type Phase = 'idle' | 'question' | 'feedback' | 'evaluating' | 'generating' | 'done'
//           evaluating: khusus esai — menunggu Gemini menilai jawaban siswa
interface SessionState {
  sessionId:    string | null
  items:        Question[]
  currentIdx:   number
  phase:        Phase
  picked:       Option | null
  target:       BloomLevel      // "C1"–"C6"
  streak:       number          // jawaban berturut-turut on-target; naik setelah ≥ 2
  isDiagnostic: boolean         // true = sesi pertama topik ini, mulai C3
  prefetchedQ:  Question | null // soal N+1 yang di-fetch saat siswa baca feedback N
  answers:      Answer[]
  adaptation:   { from, to, direction } | null
  finalLevel:   number | null   // modus level sesi (bukan MAX)
  result:       BloomProfile | null
  startSession:  (params: { workspaceId, userId, topic, subject, isDiagnostic, startLevel }) => void
  choose:        (option: Option) => void            // MCQ: bloom langsung dari opt.bloom
  submitEssay:   (text: string) => Promise<void>     // Esai: kirim ke evaluate-essay Edge Fn
  next:          () => Promise<void>
  reset:         () => void
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

**Kerangka pedagogis — 4-strategi mapping Bloom:**
Rekomendasi guru menggunakan **4-strategi mapping** berbasis distribusi `bloom_profiles` aktual kelas (bukan urutan linier Gagné's Nine Events). Alasan: mapping berbasis data lebih actionable untuk guru SMA karena langsung terhubung ke level Bloom terukur, bukan tahap instruksi yang diasumsikan.

| Distribusi kelas | Strategi | Metode kunci |
|---|---|---|
| Mayoritas C1–C2 | Direct Instruction | Demonstrasi visual, analogi, worked examples |
| Tersebar C2–C3 | Cooperative Learning | Think-Pair-Share, peer explanation |
| Kelas di C3–C4 | Problem-Based Learning | Masalah kontekstual, Socratic questioning |
| Sebagian C5–C6 | Project Exhibition | Proyek terbuka, peer teaching |

Pemilihan otomatis: `pickClassStrategy(profiles)` di `src/lib/recs.js`.

**Untuk Guru — per-topik breakdown:**
- Tampilkan distribusi kelas (chip per level) di panel atas.
- Per-topik: rata-rata level kelas, badge **Siap C6** (avg ≥ 5) atau **Perlu Penguatan** (avg ≤ 2), jumlah laporan proyek yang masuk.
- 4 card strategi mengajar dengan border-top warna bloom, metode sebagai chip.

**Untuk Siswa — berbasis bloom_profile individu + VARK:**
- **Survei VARK** (4 pertanyaan): tentukan gaya belajar dominan (Visual/Auditori/Baca-Tulis/Kinestetik). Disimpan di `profiles.vark_style`. Tampil sekali saat pertama buka halaman rekomendasi.
- Identifikasi level terlemah (nilai terendah di profil radar).
- Generate 3 rekomendasi via Edge Function `get-recommendations` (Gemini 2.5 Flash): judul aktivitas + alasan + tipe + estimasi waktu.
- Tiap rekomendasi: **tautan sumber belajar terverifikasi** (`resourceUrl` dari `belajar.kemdikbud.go.id` / `id.khanacademy.org`) dan **challenge question** untuk mendorong naik level.
- CTA card C6 "Tantangan Mencipta" di bagian bawah.
- Mode demo: fallback ke template lokal `ACTIVITIES` di `src/lib/recs.js`.

**Proyek Mini (C6):**
- Siswa mengunggah laporan proyek via form `/siswa/proyek`.
- Input: file (PDF/doc), topik, deskripsi singkat.
- `api.submitProject()` → menyimpan metadata ke tabel `project_submissions` (Supabase) atau localStorage (demo).
- Guru melihat daftar laporan per topik di halaman Rekomendasi.

---

### MODUL 5 — Bloom Analytics Dashboard (Guru)

**Proses — catatan implementasi:**
- **Agregasi**: Saat ini menggunakan runtime query (`getClassStats()` di `src/lib/api.js`) + `useMemo()` di client — cukup untuk skala demo (≤50 siswa). Materialized View adalah jalur upgrade produksi; namun Supabase Realtime tidak kompatibel dengan MV (`postgres_changes` hanya bekerja pada tabel biasa), sehingga heatmap live tetap mengandalkan tabel `bloom_profiles` langsung.
- **Visualisasi**: `BloomRadar` menggunakan Recharts `RadarChart`. Komponen lain menggunakan CSS grid / SVG murni karena lebih tepat: `ClassHeatmap` (CSS grid — Recharts tidak punya native heatmap grid), `TrajectoryChart` (SVG murni — titik berwarna per bloom level), `GrowthBars` (flexbox — lebih ringan dari Recharts BarChart). Dependensi `recharts` tetap tercatat di `package.json`.
- **Realtime**: `supabase.channel('bloom-updates').on('postgres_changes', ...)` pada tabel `bloom_profiles` + `sessions`.

**Visualisasi:**

**a. Stat Cards (4 kartu di atas)**
```
Soal dibuat AI minggu ini  |  Naik ≥1 level · 2 minggu (%)  |  Perlu perhatian  |  Rata-rata kelas
```
"Naik ≥1 level · 2 minggu" = **persentase** siswa aktif dalam 14 hari terakhir yang level akhirnya lebih tinggi dari level awal dalam window tersebut. Dihitung di `getClassStats()` dengan membandingkan sesi pertama vs terakhir per siswa dalam window 14 hari.

**b. Bloom Class Heatmap**
Grid: baris = topik, kolom = C1–C6, sel = % siswa di level itu.
Warna sel = bloom color dengan opacity proporsional ke % (rendah = pudar, tinggi = solid).
Angka di dalam sel. Hover scale(1.06). Implementasi: CSS grid murni (`ClassHeatmap.jsx`).

**c. Trajektori kognitif siswa (line chart)**
X: sesi 1–N, Y: bloom level 1–6.
Selector siswa (dropdown) di header panel.
Area fill gradient (teal, opacity rendah).
Setiap titik: lingkaran warna bloom-level-nya.
Y-axis label: C1–C6 berwarna. Implementasi: SVG murni (`TrajectoryChart.jsx`).

**d. Growth stacked bars**
X: Minggu 1–4, Y: stacked 100% (distribusi bloom).
Warna tiap segmen = bloom color. Implementasi: flexbox murni (`GrowthBars.jsx`).

**e. Radar chart (profil siswa individual)**
6 sumbu = C1–C6, nilai 0–100 per sumbu.
Recharts `RadarChart` + `Radar` (`BloomRadar.jsx`).

**f. Tabel aktivitas kelas**
Kolom: Nama, Bloom Level (chip), Tren (▲/▼/—), Sesi, Status & Saran.
Status chip: "On-track" (c3), "Plateau" (c4), "Perlu perhatian" (c6).
**Filter Bloom Level**: pill C1–C6 + "Semua" di header panel — memfilter baris tabel secara langsung.
Saran intervensi per siswa: plateau → "Variasikan metode — coba diskusi atau soal analisis baru"; attention → "Jadwalkan sesi penguatan langsung C1–C2".

**Realtime:** `supabase.channel('bloom-updates').on('postgres_changes', ...)` untuk update heatmap & stat cards live saat siswa menyelesaikan sesi. Demo mode: `CustomEvent 'vsc:bloom-updated'`.

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
- Panggil Gemini 2.5 Flash API (zero-shot prompt)
- Parse JSON response
- Insert ke tabel `questions` (published=false)
- Return questions dengan UUID dari DB

### `get-recommendations`
Input: `{ userId, workspaceId, topic }`
Output: `{ studentRecs, strategy }`
- Baca `bloom_profiles` user
- Hitung weakest level
- Generate 3 rekomendasi via prompt singkat ke Gemini
- Return structured JSON

### `evaluate-essay`
Input: `{ answer, rubric, topic, subject, targetBloom }`
Output: `{ bloom_level_achieved, feedback, followUpPrompt }`
- Kirim jawaban siswa + rubrik Bloom-based ke Gemini 2.5 Flash
- Gemini menilai kedalaman kognitif jawaban dan mencocokkan ke rubrik
- Return: level yang dicapai (C1–C6), narasi feedback konstruktif, satu pertanyaan lanjutan
  untuk mendorong siswa ke level berikutnya

### `update-bloom-profile`
Input: `{ sessionId, live?: boolean }` — `live=true` untuk update per-soal (tanpa increment session_count)
- Baca semua `session_answers` dalam sesi itu
- Hitung distribusi bloom + blend 60/40 mastery + current_level (mastery ≥ 60%)
- `live=false` (default): juga increment session_count dan hitung trend vs sesi sebelumnya
- Upsert ke `bloom_profiles`

> Semua logika adaptif berjalan di **Supabase Edge Functions** (Deno runtime) — tidak ada
> Express server terpisah. Bloom level siswa sudah tersimpan di skema soal (`opt.bloom`),
> sehingga tidak diperlukan model klasifikasi (Bloom Classifier) terpisah untuk soal MCQ.
> Klasifikasi AI hanya dipanggil untuk soal Esai via Edge Function `evaluate-essay`.

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
