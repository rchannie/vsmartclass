# Panduan Demo & Testing — VSmartClass

Checklist untuk merekam video demo GEMASTIK XIX dan menjalankan pengujian.

## 1. Menjalankan Aplikasi

```bash
npm install
npm run dev          # buka http://localhost:5173
```

**Dua mode backend (otomatis):**

| Mode | Kapan aktif | Cocok untuk |
|---|---|---|
| **Demo** (localStorage + seed) | `.env` Supabase kosong | Rekaman video — data seed langsung tersedia, tanpa internet |
| **Produksi** (Supabase + Gemini) | `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` terisi | Demo realtime multi-perangkat |

Mode demo sudah berisi seed: 1 guru, 5 siswa dengan profil Bloom beragam
(Aisyah C4 ↑, Dimas C3 →, Citra C5 ↑, Bagas C2 →, Elsa C1 ↓), dan 3 soal
published topik **Sistem Persamaan Linear** — heatmap, radar, dan trajektori
langsung terisi.

## 2. Menjalankan Pengujian (untuk adegan testing di video)

```bash
npm test             # 89 unit/integration/component test — sekali jalan
npm run test:watch   # mode watch (live)
npm run test:e2e     # 11 E2E (Playwright) — termasuk regresi aksesibilitas
npm run lint         # ESLint bersih
npm run build        # build produksi
```

Rincian cakupan test & angka coverage: **[`CHANGES.md`](CHANGES.md) §3**.
Ringkasan singkat (`src/lib/__tests__/`, `src/stores/__tests__/`) — logika
inti sesuai proposal:

- **bloom.test.js** — aturan adaptasi *consecutive-success streak* (naik butuh
  2 jawaban berturut, turun seketika, batas C6), tier kesulitan
  (Dasar/Menengah/Lanjut), status siswa (on-track/plateau/perlu perhatian),
  agregasi pola kesalahan/miskonsepsi per topik.
- **profile.test.js** — *mastery blend 60/40* akhir sesi, ambang
  `current_level ≥ 60`, tren, hitungan sesi, anti-lonjakan profil.
- **recs.test.js** — rekomendasi siswa Skenario A (celah pondasi / ZPD) vs
  Skenario B (fondasi kuat), 4 ambang strategi kelas guru, spaced review.
- **session.test.js** — state machine sesi adaptif penuh: gerbang justifikasi
  RF-11, penurunan level saat justifikasi tidak verified, penyelesaian sesi.
- **integration.demo.test.js** — alur utuh generate → jawab → profil →
  statistik, termasuk regresi keamanan (opsi tersanitasi sebelum dijawab).

## 3. Alur Rekaman Video Demo (±5 menit)

### Babak 1 — Landing & Onboarding (30 dtk)
1. Buka `/` → landing page: hero "level berpikir", tangga Bloom C1–C6,
   tiga pilar, cara kerja guru vs siswa.
2. Klik **Daftar Gratis** → daftar sebagai **Guru**.
3. Wizard panduan 5 langkah muncul otomatis → klik *Lanjut* beberapa kali.
   (Wizard bisa dibuka ulang lewat ikon **?** di sidebar.)

### Babak 2 — Guru (90 dtk)
4. Dashboard → **buat workspace**, tunjukkan kode undangan (VSC-XXXX).
5. Menu **Buat Soal** → isi topik + target Bloom → AI menyusun soal yang
   tiap opsinya berlabel C1–C6 → tinjau → **Publikasikan ke kelas**.
6. Menu **Analitik** → heatmap kelas, trajektori siswa, radar Bloom,
   tabel aktivitas dengan filter level + saran intervensi.

### Babak 3 — Siswa (2 mnt)
7. Browser kedua / incognito → daftar sebagai **Siswa** → wizard versi siswa.
8. **Gabung kelas** pakai kode dari guru.
9. **Mulai sesi adaptif**: sesi pertama mulai dari C3 (Kalibrasi Awal) —
   tunjukkan feedback formatif ("tidak ada jawaban salah") dan
   naik/turunnya target antar soal.
10. Selesai sesi → **Profil Bloom** (radar) → **Rekomendasi** (survei VARK
    sekali, lalu 3 kartu aktivitas + challenge question).
11. **Proyek** → unggah laporan (drag-drop) sebagai bukti C6.

### Babak 4 — Loop kembali ke Guru (60 dtk)
12. Kembali ke layar guru: heatmap/analitik sudah ter-update
    (realtime di mode Supabase; di mode demo refresh halaman).
13. Menu **Rekomendasi** guru: distribusi level kelas, breakdown per topik,
    laporan proyek masuk, dan strategi mengajar yang disarankan.
14. Tutup dengan `npm test` di terminal — 89 test hijau.

## 4. Tips Rekaman

- **Reset wizard**: hapus key `vsc-onboard-v1-<userId>` di localStorage
  (DevTools → Application) agar wizard muncul lagi saat rekaman ulang.
- **Reset data demo**: hapus key `vsc-demo-db-v1` di localStorage.
- **Dark mode**: ikon bulan di sidebar — tunjukkan sekilas untuk nilai plus.
- Mode demo tidak butuh API key — semua fitur AI memakai template lokal
  yang sama logikanya dengan Edge Function produksi.
