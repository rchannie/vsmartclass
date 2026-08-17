# CHANGES.md — Ringkasan Penyempurnaan VSmartClass

Dokumen ini merangkum pekerjaan penyempurnaan VSmartClass untuk GEMASTIK XIX
(divisi Pengembangan Perangkat Lunak), dikerjakan dalam 5 fase menjawab
masukan reviewer: *"idenya bagus, tapi software-nya belum sekompleks
judulnya — lengkapi lagi. Lengkapi perancangan dan pengujiannya."*

Titik awal (audit lengkap): **`AUDIT.md`**. Detail arsitektur (ERD, sequence
diagram, state machine): **`docs/ARCHITECTURE.md`**. Dokumen ini adalah
ringkasan *before/after* dengan angka konkret, ditulis untuk dikutip di
proposal/dokumen teknis lomba.

---

## Ringkasan per fase

| Fase | Fokus | Commit |
|---|---|---|
| 0 | Audit menyeluruh — peta fitur vs klaim proposal, temuan keamanan, rencana perbaikan | (dokumen `AUDIT.md`, tanpa perubahan kode) |
| 1 | Lengkapi fitur inti yang hilang/parsial | `feat(fase-1)` |
| 2 | Perancangan — tutup celah keamanan label Bloom, rapikan skema DB, `docs/ARCHITECTURE.md` | `feat(fase-2)` |
| 3 | Pengujian — unit/integration/E2E, skrip RLS | `test(fase-3)` |
| 4 | Aksesibilitas WCAG 2.1 AA | `feat(fase-4)` |
| 5 | Laporan (dokumen ini, README, LICENSE) | — |

---

## 1. Fitur — status sebelum vs sesudah

Mengacu tabel lengkap di `AUDIT.md` §1. Hanya baris yang statusnya **berubah** ditampilkan.

| Klaim proposal | Sebelum | Sesudah |
|---|---|---|
| **RF-11** — Justifikasi tertulis untuk opsi PG bernalar C4+, dinilai AI | ❌ Tidak ada sama sekali | ✅ Alur penuh: opsi ≥C4 → wajib tulis alasan → Edge Function `evaluate-justification` (Gemini) → `verified=false` menurunkan level yang tercatat satu tingkat |
| Rate limiting kuota Gemini | ❌ Tidak ada | ✅ Tabel `ai_usage` + `_shared/rateLimit.ts`, 8 panggilan/menit/pengguna, diterapkan di kelima Edge Function yang memanggil Gemini |
| Pola kesalahan/miskonsepsi per topik (guru) | ❌ Tidak ada | ✅ `summarizeMisconceptions()`, panel "Pola Kesalahan & Miskonsepsi" di Analitik |
| Spaced review (siswa) | ❌ Tidak ada | ✅ `findSpacedReviewTopics()`, kartu "Waktunya review" di halaman Rekomendasi siswa |
| Ekspor laporan kelas CSV/PDF (guru) | ❌ Tidak ada | ✅ Tombol CSV & PDF di Analitik (PDF di-*lazy-load* agar bundle utama tidak membengkak) |
| Modul 6 — guru "beri nilai" laporan proyek | 🟡 Hanya tinjau/unduh, tanpa nilai | ✅ Kolom `score`/`teacher_feedback`/`reviewed_at`, form nilai di Proyek Siswa, riwayat+nilai tampil ke siswa |
| Hiperparameter mesin adaptif (blend 60/40, ambang 60, streak 2, panjang sesi) | Tersebar sebagai angka hardcoded di beberapa file | ✅ Satu sumber kebenaran: `src/lib/config.js` (`ADAPTIVE_CONFIG`) |
| **Label Bloom per-opsi PG bisa diintip DevTools sebelum menjawab** (batasan yang disebut proposal sendiri) | ❌ `select('*')` tabel `questions` mengembalikan `options[].bloom/indicator/feedback` penuh ke siswa | ✅ Klien hanya terima `{id, text}` (Edge Function `get-next-question`); label dibuka `reveal-mcq-option` **hanya untuk opsi yang dipilih**, **setelah** dijawab. Akses baca penuh tabel `questions` kini guru-only (RLS) |
| Skema DB & migrasi | `supabase/setup.sql` hilang RPC `join_workspace_by_code` — gagal total bila dipakai apa adanya | ✅ Konsolidasi penuh migrasi 0001–0010, satu skrip setup yang benar-benar lengkap |
| `docs/ARCHITECTURE.md` | Tidak ada | ✅ ERD, sequence diagram "siswa menjawab soal", state machine sesi & adaptasi, ringkasan trust boundary |

Fitur yang **sudah solid sejak awal** (tidak perlu perombakan, hanya diverifikasi & diuji): auth/RBAC/RLS dasar, workspace + kode undangan, Smart Question Generator (Gemini + label Bloom + feedback per opsi), evaluasi esai, mesin adaptif mikro (streak) & makro (EWMA), rekomendasi siswa (VARK) & guru (4 strategi), dashboard analitik (heatmap/trajectory/radar/growth), upload proyek, sesi diagnostik C3, pre-fetch soal berikutnya.

---

## 2. Keamanan & perancangan (Fase 2)

- **Sebelum**: siswa bisa membaca *seluruh* isi `questions.options` (termasuk
  label Bloom, indikator kognitif, dan feedback tiap opsi) langsung dari
  respons Supabase begitu soal `published` — terlihat di tab Network DevTools
  **sebelum** siswa menjawab. Ini persis batasan yang disebut proposal sendiri
  harus ditutup.
- **Sesudah**: pemilihan soal berikutnya (yang perlu membaca label Bloom tiap
  opsi untuk mencocokkan target level adaptif) dipindah sepenuhnya ke server
  (Edge Function `get-next-question`, service role). Klien hanya menerima
  `{id, text}` per opsi. Label sesungguhnya baru diungkap `reveal-mcq-option`
  untuk **satu opsi yang benar-benar dipilih**, setelah tombol "Kirim jawaban"
  diklik. RLS tabel `questions` disempitkan: akses penuh (`select('*')`) kini
  hanya untuk guru pemilik workspace (`is_guru_of`).
- **Keterbatasan yang didokumentasikan (bukan overclaim)**: penulisan baris
  `session_answers` tetap dilakukan klien (RLS memvalidasi kepemilikan sesi,
  bukan konsistensi nilai `bloom_chosen`) — mengunci integritas penuh
  (mencegah klien memalsukan jawaban lewat panggilan REST mentah, bukan
  lewat UI) adalah perbaikan lebih dalam di luar cakupan fase ini. Lihat
  `docs/ARCHITECTURE.md` §2 untuk detail.
- `GEMINI_API_KEY` diverifikasi ulang: hanya pernah dibaca lewat
  `Deno.env.get()` di dalam Edge Function, tidak ada jejak di kode klien
  maupun bundel Vite.

---

## 3. Pengujian (Fase 3)

### Sebelum
- 32 unit test (3 file), semua logika pure-function (`bloom.js`, `demo.js`, `recs.js`).
- Tidak ada integration test, E2E, test keamanan RLS, atau pengukuran coverage.
- `package.json` tidak punya script `test:coverage`.

### Sesudah
- **89 unit/integration/component test** (11 file), semua lulus:
  - `stores/session.test.js` — state machine sesi adaptif penuh (11 test): transisi fase, gerbang justifikasi RF-11, penurunan level saat justifikasi gagal, penyelesaian sesi.
  - `lib/__tests__/integration.demo.test.js` — alur utuh generate → jawab → reveal → profil → statistik kelas, mode demo (= "mock Gemini", karena demo mode tidak pernah memanggil AI sungguhan). Termasuk regresi eksplisit untuk temuan keamanan Fase 2.
  - `lib/__tests__/api.demo.test.js` — auth, workspace, VARK, proyek (Modul 6), miskonsepsi (Modul 5): 10 test.
  - `lib/__tests__/export.test.js` — ekspor CSV.
  - Component test (React Testing Library): `BloomBadge`, `ClassHeatmap`, `StatCard`, `StatusTag`, `ProgressDots`, `Segmented`, `Avatar`.
  - `hooks/__tests__/useClassData.test.jsx` — verifikasi jalur guru vs siswa tidak tertukar.
  - Ditambah dari Fase 0: `bloom.test.js`, `profile.test.js`, `recs.test.js` (32 test asli + tambahan `summarizeMisconceptions`/`findSpacedReviewTopics`).
- **11 E2E test (Playwright)**, mode demo, semua lulus:
  - `e2e/guru.spec.js` (4), `e2e/siswa.spec.js` (3), `e2e/a11y.spec.js` (4, lihat §4).
- **Skrip test RLS** (`supabase/tests/rls.test.js`) — isolasi antar-siswa & antar-kelas, siswa tak bisa `select('*')` tabel `questions` mentah, tak bisa insert `bloom_profiles` langsung, tak bisa update nilai proyek. **Tidak dijalankan otomatis** — lingkungan pengembangan ini tidak punya Docker/Supabase CLI lokal untuk `supabase start`; skrip ditulis untuk dijalankan manual (`npm run test:rls`) terhadap proyek Supabase uji/staging (env var & prasyarat didokumentasikan di kepala file).
- Script baru: `npm run test:coverage`, `npm run test:e2e`, `npm run test:rls`.

### Coverage — jujur, target 80% TIDAK tercapai secara keseluruhan repo

| Lapisan | Coverage (statements) |
|---|---|
| `src/lib/recs.js` | **100%** |
| `src/lib/bloom.js` | **94.4%** |
| `src/stores/session.js` | **83.0%** |
| `src/lib/demo.js` | **78.2%** |
| `src/lib/export.js` | 62.2% |
| `src/lib/api.js` | 48.6% |
| **Keseluruhan repo** | **28.8%** (statements) / 18.3% (branches) / 28.8% (functions) / 29.1% (lines) |

**Kenapa tidak 80%**: ~25 halaman React di `src/pages/**` (mayoritas baris
kode proyek) punya coverage 0% — bukan karena diabaikan, tapi karena
masing-masing butuh mocking berat (store `useAuth`/`useActiveWorkspace`,
React Query, React Router) untuk nilai tangkapan-bug yang relatif kecil
dibanding effort-nya (halaman-halaman ini sebagian besar komposisi hook +
JSX presentasional, bukan logika unik). Prioritas diberikan ke **mesin
adaptif dan lapisan data** — bagian yang paling kritis terhadap kebenaran
klaim inti proposal (Bloom evaluation, adaptasi dua lapis, RF-11) — bukan
mengejar angka lewat test dangkal di lapisan presentasi.

**Rekomendasi lanjutan** (di luar cakupan fase ini): tambah RTL test per
halaman guru/siswa dengan helper `renderWithProviders()` (QueryClient +
router + auth mock terpusat) untuk menaikkan coverage `src/pages/**` secara
efisien.

---

## 4. Aksesibilitas (Fase 4)

Audit otomatis dengan **axe-core** (`@axe-core/playwright`), tag
`wcag2a + wcag2aa + wcag21aa`, terhadap **16 halaman utama** (Landing,
Login, Daftar, dan seluruh alur guru & siswa) dalam mode terang (default).

| | Sebelum | Sesudah |
|---|---|---|
| Total pelanggaran (16 halaman) | **24** | **0** |
| Halaman dengan pelanggaran | 15 dari 16 | 0 dari 16 |
| Kategori pelanggaran | `color-contrast` (16×), `select-name` (6×), `aria-prohibited-attr` (1×), `label` (1×) | — |

### Perbaikan konkret

- **Kontras warna** (akar masalah terbesar): `--accent` dan `--c1`..`--c6`
  di `src/styles/tokens.css` digelapkan secukupnya (hue dipertahankan,
  nilai lama dicatat di komentar) agar ≥4.5:1 sebagai teks maupun sebagai
  latar solid + teks putih. Token dipecah jadi `--accent` (teks, theme-aware)
  vs `--accent-fill` (latar tombol, sama di kedua tema) — satu warna tunggal
  tidak bisa memenuhi kedua peran itu sekaligus di dark mode (lihat komentar
  perhitungan di `tokens.css`). Tint badge "soft" (BloomBadge, StatusTag,
  BloomLadder) diturunkan dari 12–16% ke 6–8%. Opacity 0.55 pada level
  Bloom "akan datang" di `BloomLadder` **dihapus** — level manapun opacity
  itu diturunkan ke nilai yang terlihat "pudar", teks berwarna jatuh di
  bawah AA.
- **Label ARIA**: 13 elemen `<select>` (pemilih kelas/siswa/topik) diberi
  `aria-label`; 3 field form (`Workspace tujuan`, `Mata pelajaran`, `Jumlah
  soal`) di Buat Soal dan field `Topik` di Kumpulkan Proyek diberi
  `htmlFor`/`id` yang benar (bukan sekadar `aria-label`, karena sudah ada
  `<label>` visible di sampingnya).
- **Struktur ARIA**: `ProgressDots` (indikator "Soal N dari 6") sebelumnya
  punya `aria-label` di `<div>` tanpa `role` valid — diberi
  `role="progressbar"` + `aria-valuenow/min/max`.
- **Alt text grafik** (WCAG 1.1.1, diminta eksplisit di brief): `BloomRadar`
  dan `GrowthBars` (sebelumnya nol alternatif teks untuk SVG/grid grafik)
  diberi `role="img"` + `aria-label` ringkasan data. `TrajectoryChart` sudah
  punya ini sejak awal.
- **Navigasi keyboard**: diverifikasi terstruktur sudah benar — nol pola
  `<div onClick>` tanpa `role` di seluruh codebase (semua elemen interaktif
  memakai `<button>`/`<a>`/`<select>` asli, otomatis dapat fokus keyboard).
  Fokus browser default tidak pernah di-*suppress* tanpa pengganti (hanya
  `.input` meng-override `outline`, digantikan `focus:` ring/border).
- **Loading/empty/error state**: diperiksa ulang di seluruh halaman —
  sudah rapi sejak sebelum fase ini (komponen `AIThinking`, pesan kosong
  per-komponen seperti "Belum ada tugas"/"Belum ada data sesi siswa", pola
  `try/catch` + `setError` konsisten di semua form). Tidak ada perubahan.

### Regresi permanen

`e2e/a11y.spec.js` menjalankan axe-core terhadap Landing, Login, alur sesi
adaptif siswa, dan Dashboard+Analitik guru sebagai bagian dari
`npm run test:e2e` — pelanggaran yang sudah diperbaiki tidak akan diam-diam
kembali tanpa terdeteksi CI/lokal.

### Keterbatasan yang jujur dicatat

Cakupan yang **diverifikasi** adalah mode terang (default) di 16 halaman
utama. Dark mode diberi `--accent` yang dihitung agar tetap ≥4.5:1 terhadap
latar gelap (perhitungan matematis, bukan tebakan), tapi **tidak dijalankan
axe secara penuh** di dark mode — dicatat sebagai rekomendasi lanjutan,
bukan diklaim teraudit. Lighthouse tidak berhasil dijalankan di lingkungan
pengembangan ini (tidak ada instalasi Chrome standalone yang kompatibel
dengan `chrome-launcher` di luar browser bundel Playwright); axe-core dipilih
sebagai pengganti yang setara untuk pemeriksaan WCAG otomatis.

---

## 5. Housekeeping

- `LICENSE` (MIT) ditambahkan.
- `package.json`: field `description`, `license` ditambahkan; versi
  dinaikkan ke `0.1.0` mencerminkan penyelesaian fitur inti; script test
  dirapikan (`test`, `test:watch`, `test:coverage`, `test:e2e`, `test:rls`).
- `README.md` diperbarui: instruksi setup lengkap (menunjuk ke
  `supabase/setup.sql` yang sekarang benar-benar lengkap), env vars,
  daftar fitur terkini, arsitektur, testing, aksesibilitas.
- Branding disamakan ke **GEMASTIK XIX — divisi Pengembangan Perangkat
  Lunak** (sebelumnya menyebut "LIDM 2026" di README/DEMO — murni teks
  dokumentasi, tidak memengaruhi kode).

---

## 6. Verifikasi akhir

Setiap fase ditutup dengan: `npm test` (unit/integration), `npm run lint`,
`npm run build`, dan untuk Fase 1–4 juga `npm run test:e2e` — semuanya hijau
di commit final. Alur kritis (justifikasi C4+, ekspor CSV/PDF, form nilai
proyek, sanitasi label Bloom) diverifikasi tambahan dengan menjalankan
aplikasi sungguhan di browser (Playwright, mode demo) dan memeriksa tidak
ada error console.
