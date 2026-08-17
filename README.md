# VSmartClass

Sistem evaluasi adaptif dan pemetaan kognitif berbasis **Taksonomi Bloom
(C1–C6) dengan AI**. Karya **GEMASTIK XIX** — divisi Pengembangan Perangkat
Lunak.

Setiap siswa menjawab lewat cara berpikirnya sendiri — pilihan ganda yang
tiap opsinya mewakili level kognitif berbeda (bukan satu kunci jawaban
tunggal), esai yang dinilai AI, dan justifikasi tertulis untuk penalaran
tingkat tinggi (C4+) — untuk membangun peta kognitif *per topik* yang
beradaptasi dua lapis: mikro (per-jawaban, intra-sesi) dan makro (per-sesi,
antar-waktu). Guru mendapat dashboard analitik real-time dan rekomendasi
strategi mengajar; siswa mendapat rekomendasi belajar personal sesuai gaya
belajar (VARK) dan level terlemahnya.

## Tech Stack

React 19 + Vite · Tailwind CSS v3 · Zustand · React Query · React Router v6 ·
Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions/Deno) ·
Google Gemini 2.5 Flash (hanya dipanggil dari Edge Function — kunci API
tidak pernah ke klien) · Recharts · Lucide React

## Fitur

1. **Manajemen Pengguna & Workspace** — registrasi/login guru & siswa
   (Supabase Auth + JWT), guru membuat kelas dengan kode undangan, RLS
   ketat antar-kelas.
2. **Smart Question Generator** — guru atur parameter (mapel, topik,
   jenjang, jumlah, tipe, target Bloom maksimum) → Gemini menyusun soal PG
   (tiap opsi berlabel C1–C6 + indikator kognitif + feedback formatif) atau
   Esai (dengan rubrik per level).
3. **Bloom-Based Evaluation & Adaptive Difficulty Engine**
   — inti aplikasi:
   - PG: label Bloom opsi dipilih dibuka **hanya setelah dijawab** (server-
     side, lihat §Keamanan).
   - Esai: dinilai Gemini (temperatur 0.3) → level Bloom + feedback naratif.
   - **RF-11 — Justifikasi C4+**: opsi bernalar C4 ke atas mewajibkan siswa
     menulis alasan singkat, dinilai AI (`evaluate-justification`) — bila
     tidak menunjukkan penalaran level tsb, level yang tercatat turun satu
     tingkat.
   - **Adaptasi dua lapis**: mikro (*consecutive-success streak* — target
     naik 1 level setelah 2× jawaban berturut ≥ target, turun seketika ke
     level yang ditunjukkan saat gagal) dan makro (EWMA 60/40 antar-sesi,
     `current_level` = level tertinggi dengan mastery ≥60).
   - Kalibrasi awal dari C3 (bukan C1) untuk sesi pertama tiap topik, 6 soal
     per sesi, pre-fetch soal berikutnya di background, rate limiting kuota
     Gemini per pengguna.
4. **Rekomendasi Personal** — siswa: 3 aktivitas prioritas dari level
   terlemah, disesuaikan gaya belajar VARK + *challenge question* + kartu
   *spaced review* untuk topik yang belum tuntas & lama tak disentuh. Guru:
   1 dari 4 strategi mengajar dari distribusi level kelas, plus panel
   **pola kesalahan/miskonsepsi per topik**.
5. **Bloom Analytics Dashboard** — real-time (Supabase Realtime): stat
   cards, class heatmap, trajectory per siswa, growth stacked bars, radar
   6 sumbu, tabel aktivitas dengan status intervensi. **Ekspor CSV & PDF**
   untuk laporan kelas.
6. **Project Submission** — siswa unggah laporan (PDF/Word ≤10MB) sebagai
   bukti C6 setelah level tuntas; guru meninjau, mengunduh, **dan memberi
   nilai**.

Detail perancangan (ERD, sequence diagram, state machine adaptasi):
**[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**. Riwayat audit & temuan:
**[`AUDIT.md`](AUDIT.md)**. Ringkasan perubahan & angka before/after
(coverage, skor aksesibilitas): **[`CHANGES.md`](CHANGES.md)**.

## Menjalankan (mode demo — tanpa backend)

```bash
npm install
npm run dev
```

Tanpa kredensial Supabase (`.env` kosong), aplikasi otomatis berjalan dalam
**mode demo**: data tersimpan di localStorage dan ter-seed dengan data demo.
Generator soal AI memakai template lokal (tanpa API key) — logikanya sama
dengan Edge Function produksi, termasuk sanitasi label Bloom sebelum
dijawab.

Akun demo (tombol satu klik tersedia di halaman Masuk saat mode demo aktif):

| Peran | Email                  | Kata sandi |
| ----- | ---------------------- | ---------- |
| Guru  | ratna@sma3bdg.sch.id   | guru123    |
| Siswa | aisyah@siswa.com       | siswa123   |
| Siswa | dimas / citra / bagas / elsa @siswa.com | siswa123 |

Kode kelas demo: `VSC-7QK2` (XI MIPA 2 · SMA Negeri 3 Bandung).

> Mode demo bisa di-reset dengan menghapus key `vsc-demo-db-v1` di localStorage.

## Menjalankan dengan Supabase (produksi)

1. Buat proyek di [supabase.com](https://supabase.com).
2. Jalankan **`supabase/setup.sql`** (skrip setup lengkap & idempoten,
   mencakup seluruh migrasi 0001–0010: skema tabel, RLS, RPC, trigger
   profil, rate limiting) di SQL Editor — cukup salin-tempel seluruh isi
   file, sekali jalan. *(Untuk proyek yang sudah pernah menjalankan versi
   `setup.sql` lama, jalankan migrasi bernomor baru di `supabase/migrations/`
   secara berurutan alih-alih mengulang `setup.sql` — lihat catatan di
   kepala file.)*
3. Buat akun-akun demo lewat Authentication (atau biarkan pengguna
   mendaftar sendiri), lalu jalankan `supabase/seed.sql` bila ingin data
   demo GEMASTIK.
4. Deploy Edge Functions dan set secret Gemini:

   ```bash
   supabase functions deploy generate-questions get-next-question \
     reveal-mcq-option evaluate-essay evaluate-justification \
     update-bloom-profile get-recommendations
   supabase secrets set GEMINI_API_KEY=...
   ```

5. Salin `.env.example` → `.env` dan isi:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

   `GEMINI_API_KEY` **tidak pernah** masuk `.env` klien — hanya di secrets
   Edge Function (langkah 4).

6. `npm run dev` — aplikasi otomatis beralih dari mode demo ke Supabase.

### Deploy ke Vercel

- Build command: `npm run build` · Output: `dist/`.
- Set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sebagai environment
  variables di dashboard Vercel (bukan `.env` yang di-commit).
- Edge Functions & secrets Gemini dikelola terpisah lewat Supabase CLI
  (langkah 4 di atas), tidak lewat Vercel.

## Pengujian

```bash
npm test              # unit + integration + component test (Vitest + RTL)
npm run test:watch    # mode watch
npm run test:coverage # laporan coverage (text + html)
npm run test:e2e      # E2E (Playwright, mode demo) — termasuk regresi aksesibilitas
npm run test:rls      # skrip keamanan RLS — lihat catatan di bawah
npm run lint          # ESLint
npm run build         # build produksi
```

`npm run test:rls` (`supabase/tests/rls.test.js`) memverifikasi isolasi
antar-siswa/antar-kelas terhadap RLS Postgres sungguhan — **tidak berjalan
otomatis** (butuh `RLS_TEST_SUPABASE_URL`/`RLS_TEST_SUPABASE_ANON_KEY`
menunjuk proyek Supabase **uji/staging**, jangan pernah produksi). Lihat
komentar di kepala file untuk env var & prasyarat lengkap.

Ringkasan cakupan test & coverage saat ini ada di
**[`CHANGES.md`](CHANGES.md) §3**.

## Aksesibilitas

Diaudit dengan axe-core (`@axe-core/playwright`) terhadap 16 halaman utama,
WCAG 2.1 AA — hasil & perbaikan lengkap di **[`CHANGES.md`](CHANGES.md) §4**.
Regresi otomatis: `e2e/a11y.spec.js` (bagian dari `npm run test:e2e`).

## Struktur

```
src/
├── components/   bloom/ · charts/ · questions/ · ui/ · layout/
├── pages/        auth/ · guru/ · siswa/ · Join
├── stores/       auth · session (state machine sesi adaptif) · workspace
├── hooks/        useBloomProfile · useClassData · useRealtime · useActiveWorkspace
├── lib/          supabase · gemini · bloom · config (hiperparameter) ·
│                 api (lapisan data terpadu) · demo · recs · export (CSV/PDF)
└── styles/       tokens.css (design tokens, WCAG AA — lihat komentar di file)
supabase/
├── migrations/   0001–0010, skema + RLS + RPC bernomor urut
├── setup.sql     skrip setup lengkap & idempoten (gabungan seluruh migrasi)
├── seed.sql      data demo
├── tests/        rls.test.js (manual, lihat §Pengujian)
└── functions/    generate-questions · get-next-question · reveal-mcq-option ·
                  evaluate-essay · evaluate-justification · update-bloom-profile ·
                  get-recommendations · _shared/ (helper bersama)
e2e/              Playwright — alur guru, siswa, aksesibilitas
docs/
└── ARCHITECTURE.md   ERD, sequence diagram, state machine, trust boundary
```

## Catatan UX

- Tidak ada emoji di UI — ikon memakai Lucide.
- Warna Bloom selalu lewat token CSS `--c1`…`--c6` (nilai digelapkan
  secukupnya untuk WCAG AA — lihat komentar di `src/styles/tokens.css`).
- "Tidak ada jawaban salah" — setiap opsi soal mewakili level kognitif
  berbeda dengan feedback formatif; label levelnya sendiri tidak pernah
  terlihat sebelum opsi dijawab.
- Dark mode: toggle di sidebar (tersimpan di localStorage).
- Logo: letakkan `logo.png` (putih transparan) di `public/` — ditampilkan
  di dalam badge gradien teal→warm.

## Lisensi

**MIT License** — lihat berkas [`LICENSE`](LICENSE) di root repositori untuk
teks lengkap & pemegang hak cipta. Detail adopsi lisensi (alasan pemilihan,
ruang lingkup, kepatuhan dependensi): [`docs/ADOPSI_LISENSI.md`](docs/ADOPSI_LISENSI.md).
Daftar lengkap komponen pihak ketiga & lisensinya:
[`docs/DAFTAR_KOMPONEN_LISENSI.md`](docs/DAFTAR_KOMPONEN_LISENSI.md).
