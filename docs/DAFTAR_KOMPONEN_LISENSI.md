# Daftar Komponen dan Lisensi VSmartClass

**GEMASTIK XIX Divisi Pengembangan Perangkat Lunak**
Karya: *Sistem Evaluasi Adaptif dan Pemetaan Kognitif Berbasis Taksonomi
Bloom dengan AI* (VSmartClass)

Dokumen ini mendaftar seluruh komponen perangkat lunak pihak ketiga
(*library*/paket) yang digunakan VSmartClass beserta lisensinya, sebagai
bukti kepatuhan lisensi untuk keperluan penilaian lomba. Data versi dan
lisensi diambil langsung dari manifest nyata repositori pada tanggal
penyusunan dokumen ini (**17 Agustus 2026**): `package.json` +
`package-lock.json` (lockfile v3) untuk paket Node.js, diverifikasi silang
dengan output otomatis `npx license-checker`, ditambah pembacaan manual
`import` di seluruh `supabase/functions/**/*.ts` untuk komponen sisi-server
(Deno Edge Functions). **Tidak ada versi atau lisensi yang ditebak** baris
yang tidak dapat dipastikan langsung dari manifest ditandai eksplisit
"*perlu verifikasi*".

Bukti mentah pendukung: [`docs/licenses-raw.csv`](licenses-raw.csv) (keluaran
apa adanya dari `license-checker`, 378 paket termasuk transitif).

---

## Tabel 1 Dependensi Frontend / Runtime (Produksi)

Sumber: `package.json` bagian `dependencies`, versi persis dari
`package-lock.json` (lockfileVersion 3). Ini adalah paket yang benar-benar
ikut ter-*bundle* ke `dist/` dan berjalan di browser pengguna.

| Komponen / Library | Versi | Peran singkat | Lisensi (SPDX) |
|---|---|---|---|
| react | 19.2.7 | Library UI inti | MIT |
| react-dom | 19.2.7 | Rendering React ke DOM | MIT |
| react-router-dom | 6.30.4 | Routing halaman SPA | MIT |
| zustand | 5.0.14 | State management klien | MIT |
| @tanstack/react-query | 5.101.0 | Cache & sinkronisasi data async | MIT |
| @supabase/supabase-js | 2.108.1 | Klien Supabase (Auth/DB/Storage/Realtime) | MIT |
| recharts | 3.8.1 | Grafik (radar, growth bars, dsb.) | MIT |
| lucide-react | 1.17.0 | Ikon UI | ISC |
| jspdf | 4.2.1 | Pembuatan file PDF di klien | MIT |
| jspdf-autotable | 5.0.8 | Plugin tabel untuk jsPDF | MIT |

**10 dependensi langsung produksi**, seluruhnya lisensi permisif standar
(MIT/ISC).

---

## Tabel 2 Komponen Backend / Edge Functions (Deno) & Basis Data

Sumber: pembacaan manual `import` di seluruh 7 berkas
`supabase/functions/*/index.ts` dan `supabase/functions/_shared/*.ts`, serta
komponen platform yang menjalankan kode server (bukan paket npm tidak ada
di `package-lock.json`, sehingga lisensi ditentukan dari repositori sumber
resminya, sesuai arahan tugas).

| Komponen | Versi | Peran singkat | Lisensi (SPDX) |
|---|---|---|---|
| @supabase/supabase-js (via `jsr:@supabase/supabase-js@2`) | 2.x resolusi JSR saat *deploy* (tidak dikunci ke versi patch pasti di kode sumber; lihat catatan) | Klien Supabase di dalam Edge Function (dipakai ke-7 fungsi: `generate-questions`, `get-next-question`, `reveal-mcq-option`, `evaluate-essay`, `evaluate-justification`, `update-bloom-profile`, `get-recommendations`) | MIT |
| Deno | dikelola platform Supabase (tidak dipin di repo) | Runtime JavaScript/TypeScript Edge Functions | MIT |
| PostgreSQL | dikelola platform Supabase (tidak dipin di repo) | Mesin basis data relasional (RLS, RPC, tabel inti) | PostgreSQL |

**Catatan verifikasi**: kode sumber (`import { createClient } from
'jsr:@supabase/supabase-js@2'`) hanya mengunci versi **mayor** (`2`), bukan
versi patch persis berbeda dari paket npm di Tabel 1 yang terkunci persis
lewat lockfile. Versi resmi npm yang dipublikasikan untuk baris mayor yang
sama (2.108.1) diverifikasi di Tabel 1; lisensi MIT konsisten di seluruh
riwayat rilis paket ini (dikonfirmasi dari `LICENSE` di repositori
`supabase/supabase-js`). Baris Deno & PostgreSQL **tidak berasal dari
lockfile** (bukan paket npm) lisensinya dikonfirmasi dari repositori/
dokumentasi resmi masing-masing proyek (`denoland/deno` → MIT;
PostgreSQL Global Development Group → *The PostgreSQL License*, SPDX
`PostgreSQL`, lisensi permisif mirip MIT/BSD). Tidak ada import lain
(mis. dari `deno.land/std` atau `esm.sh`) ditemukan di `supabase/functions/**`.

---

## Tabel 3 Tooling Pengembangan & Pengujian (devDependencies)

Sumber: `package.json` bagian `devDependencies`, versi persis dari
`package-lock.json`. Paket ini **tidak** ikut ter-*bundle* ke aplikasi
produksi hanya dipakai saat *development*, *linting*, *build*, dan
pengujian (Vitest, React Testing Library, Playwright, axe-core).

| Komponen / Library | Versi | Peran singkat | Lisensi (SPDX) |
|---|---|---|---|
| vite | 8.0.16 | Build tool & dev server | MIT |
| @vitejs/plugin-react | 6.0.2 | Plugin React untuk Vite | MIT |
| vitest | 4.1.10 | Test runner unit/integration | MIT |
| @vitest/coverage-v8 | 4.1.10 | Laporan cakupan test (coverage) | MIT |
| @testing-library/react | 16.3.2 | Testing komponen React (RTL) | MIT |
| @testing-library/jest-dom | 7.0.1 | Matcher DOM tambahan untuk test | MIT |
| @testing-library/user-event | 14.6.4 | Simulasi interaksi pengguna (test) | MIT |
| jsdom | 29.1.1 | Simulasi DOM di lingkungan Node (test) | MIT |
| @playwright/test | 1.62.1 | Framework pengujian E2E | Apache-2.0 |
| @axe-core/playwright | 4.13.0 | Audit aksesibilitas otomatis (E2E) | MPL-2.0 |
| eslint | 10.4.1 | Linter kode JavaScript/JSX | MIT |
| @eslint/js | 10.0.1 | Konfigurasi dasar ESLint | MIT |
| eslint-plugin-react-hooks | 7.1.1 | Aturan lint React Hooks | MIT |
| eslint-plugin-react-refresh | 0.5.2 | Aturan lint Fast Refresh | MIT |
| globals | 17.6.0 | Daftar variabel global (dipakai ESLint) | MIT |
| @types/react | 19.2.17 | Deklarasi tipe TypeScript untuk React | MIT |
| @types/react-dom | 19.2.3 | Deklarasi tipe TypeScript untuk React-DOM | MIT |
| tailwindcss | 3.4.19 | Framework utility-first CSS | MIT |
| postcss | 8.5.15 | Prosesor CSS (dipakai Tailwind) | MIT |
| autoprefixer | 10.5.0 | Penambah vendor-prefix CSS otomatis | MIT |
| cross-env | 10.1.0 | Set variabel lingkungan lintas OS (npm script) | MIT |

**21 dependensi langsung pengembangan.** Satu paket, **@axe-core/playwright**
(dan dependensinya `axe-core`), berlisensi **MPL-2.0** lihat §Deteksi
Risiko Lisensi di bawah untuk penjelasan mengapa ini tidak menjadi masalah
kepatuhan bagi aplikasi.

**Total dependensi langsung (Tabel 1 + Tabel 3): 31 paket** (10 produksi +
21 pengembangan), ditambah 3 komponen sisi-server non-npm di Tabel 2.

---

## Tabel 4 Layanan Eksternal (bukan library open-source)

Komponen berikut **bukan** paket kode yang di-*install*/didistribusikan
bersama aplikasi, melainkan **layanan pihak ketiga** yang diakses lewat API
saat aplikasi berjalan. Tunduk pada Ketentuan Layanan (*Terms of Service*)
masing-masing penyedia, bukan lisensi perangkat lunak open-source.

| Layanan | Peran dalam VSmartClass | Status lisensi |
|---|---|---|
| Google Gemini 2.5 Flash (Generative Language API) | Menghasilkan soal, menilai esai/justifikasi, menyusun rekomendasi dipanggil **hanya** dari Edge Function (kunci API tidak pernah ke klien) | **Proprietary** tunduk pada [Google APIs Terms of Service](https://developers.google.com/terms) & Gemini API Additional Terms of Service |
| Supabase (platform terkelola: Auth, Postgres terkelola, Realtime, Storage, Edge Functions hosting) | Backend-as-a-Service produksi | Layanan terkelola (*managed service*); perangkat lunak inti platform Supabase sendiri open-source (Apache-2.0) tapi digunakan di sini sebagai **layanan** (SaaS), bukan komponen yang didistribusikan ulang |
| Vercel | Hosting/deploy frontend produksi | Layanan hosting terkelola tunduk pada [Vercel Terms of Service](https://vercel.com/legal/terms) |
| Google Fonts (Plus Jakarta Sans, Space Mono) | Font UI, dimuat via `<link>` CDN `fonts.googleapis.com` di `index.html` bukan paket npm | Font itu sendiri berlisensi **SIL Open Font License 1.1 (OFL-1.1)** menurut katalog resmi Google Fonts *sumber ini bukan lockfile repo, disarankan verifikasi ulang langsung di fonts.google.com sebelum dikutip final di proposal* |

**Gemini API bukan library** tidak ada baris "lisensi kode" untuknya
karena tidak ada kode Gemini yang di-*install*/didistribusikan; yang
digunakan adalah endpoint API berbayar/berkuota milik Google.

---

## Lisensi Aplikasi

| Komponen | Lisensi |
|---|---|
| **VSmartClass** (karya tim, seluruh kode di repositori ini) | **MIT License** lihat berkas [`LICENSE`](../LICENSE) di root repositori |

> Catatan teknis: `npx license-checker` melaporkan paket root
> (`vsmartclass@0.1.0`) sebagai `UNLICENSED` ini **bukan** indikasi
> aplikasi tanpa lisensi, melainkan perilaku baku `license-checker` yang
> mengabaikan field `"license"` pada paket dengan `"private": true` di
> `package.json` (kami set `private: true` secara sengaja agar tidak
> ter-*publish* tak sengaja ke registry npm, tidak berkaitan dengan lisensi
> kode). Lisensi sesungguhnya **MIT** dikonfirmasi langsung dari field
> `"license": "MIT"` di `package.json` dan isi berkas `LICENSE` di root
> repositori.

---

## Ringkasan Kepatuhan Lisensi

- **Tidak ditemukan lisensi copyleft kuat** (GPL/AGPL/LGPL) di seluruh 378
  paket (langsung + transitif) yang terdeteksi `license-checker`.
- Mayoritas mutlak paket (378 total) berlisensi permisif standar:

  | Lisensi | Jumlah paket |
  |---|---|
  | MIT | 298 |
  | ISC | 27 |
  | Apache-2.0 | 22 |
  | BSD-2-Clause | 8 |
  | BSD-3-Clause | 7 |
  | MPL-2.0 | 4 |
  | MIT-0 | 2 |
  | BlueOak-1.0.0 | 2 |
  | (MPL-2.0 OR Apache-2.0) | 1 |
  | CC-BY-4.0 | 1 |
  | CC0-1.0 | 1 |
  | (MIT AND Zlib) | 1 |
  | MIT* | 1 |
  | 0BSD | 1 |
  | MIT AND ISC | 1 |
  | UNLICENSED (paket root lihat catatan di atas) | 1 |

  **Total: 378 paket.**

- Lisensi permisif (MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause,
  0BSD, MIT-0, BlueOak-1.0.0, PostgreSQL) **mengizinkan penggunaan,
  modifikasi, dan distribusi** termasuk untuk keperluan kompetisi/lomba —
  **selama pemberitahuan hak cipta & salinan lisensi dipertahankan**
  (untuk Apache-2.0 & BSD-3-Clause, juga larangan memakai nama pemegang hak
  cipta untuk promosi tanpa izin). Tidak ada kewajiban membuka kode sumber
  aplikasi turunan (berbeda dari GPL/AGPL/LGPL, yang **tidak ditemukan**
  dalam daftar ini).

### Deteksi risiko / catatan lisensi non-standar

- **MPL-2.0 (Mozilla Public License 2.0) 4 paket + 1 dual-lisensi**:
  `@axe-core/playwright`, `axe-core` (dev, dipakai `e2e/a11y.spec.js` untuk
  audit aksesibilitas), `lightningcss` + `lightningcss-win32-x64-msvc`
  (transitif, dipakai *tooling* CSS build). MPL-2.0 adalah *copyleft lemah*
  (berbasis-berkas): kewajiban berbagi kode sumber hanya berlaku bila
  **berkas MPL itu sendiri diubah dan didistribusikan ulang** tidak
  "menular" ke kode yang sekadar memanggil/mengimpornya. Karena keempatnya
  adalah **devDependency** (alat bantu pengembangan/pengujian, tidak pernah
  ikut ter-*bundle* ke `dist/` yang dikirim ke pengguna akhir), **tidak ada
  risiko kepatuhan bagi kode aplikasi VSmartClass yang didistribusikan**.
  `dompurify` (transitif dari `jspdf`) berlisensi ganda
  `(MPL-2.0 OR Apache-2.0)` dapat dipilih jalur Apache-2.0 yang sepenuhnya
  permisif.
- **CC-BY-4.0** (`caniuse-lite`, data kompatibilitas browser, transitif
  *build-time* dari Autoprefixer/Browserslist) dan **CC0-1.0** (`mdn-data`,
  transitif) lisensi Creative Commons untuk **data**, bukan kode
  fungsional; keduanya permisif (CC0 = domain publik; CC-BY mensyaratkan
  atribusi, sudah terpenuhi lewat berkas ini). Tidak dibundel ke aplikasi.
- **BlueOak-1.0.0** (`lru-cache`, `minimatch`, transitif) lisensi
  permisif modern, setara MIT dalam hal kebebasan pakai.
- **`MIT*`** (`rgbcolor`, transitif dari `jspdf`) tanda bintang dari
  `license-checker` berarti lisensi MIT terdeteksi dari metadata tapi tanpa
  berkas `LICENSE` terpisah yang bisa diverifikasi otomatis di paket
  tersebut; ditandai untuk transparansi, bukan indikasi masalah.
- **`UNLICENSED`** hanya paket root (`vsmartclass` sendiri), dijelaskan
  di §Lisensi Aplikasi di atas; bukan dependensi pihak ketiga.
- Tidak ditemukan paket tanpa lisensi sama sekali (*license: none*) selain
  kasus paket root tersebut.

### Item yang ditandai "perlu verifikasi"

- **Lisensi font Google Fonts** (Plus Jakarta Sans, Space Mono) dikutip
  dari katalog publik Google Fonts (umumnya OFL-1.1), namun **bukan** hasil
  pembacaan manifest di repo ini (font dimuat via CDN, bukan paket
  ter-*install*). Disarankan konfirmasi ulang langsung di
  `fonts.google.com` sebelum dikutip sebagai final di dokumen proposal.
- **Versi patch persis `@supabase/supabase-js` di Edge Functions (Deno)** —
  kode sumber mengunci `jsr:@supabase/supabase-js@2` (mayor saja); versi
  patch aktual yang benar-benar berjalan bergantung pada apa yang
  di-*resolve* JSR pada saat `supabase functions deploy` dijalankan, dan
  bisa berbeda dari waktu ke waktu kecuali dikunci eksplisit ke versi penuh
  (mis. `@2.108.1`) di kode sumber.

---

## Cara Memverifikasi Ulang

Seluruh data di dokumen ini dapat direproduksi ulang oleh tim juri/reviewer
langsung dari repositori:

```bash
npm install
npx license-checker --summary              # rekap jumlah paket per lisensi
npx license-checker --production --json    # detail lengkap dependensi produksi
npx license-checker --json                 # detail lengkap termasuk devDependencies
npx license-checker --csv > docs/licenses-raw.csv   # bukti mentah (sudah disertakan)
```

Untuk komponen Deno/Edge Function, verifikasi manual:

```bash
grep -rn "^import" supabase/functions --include="*.ts"
```

## Mengekspor Dokumen Ini ke PDF

Berkas final GEMASTIK dikumpulkan dalam format PDF. Konversi cepat dari
Markdown ini, misalnya dengan [Pandoc](https://pandoc.org/):

```bash
pandoc docs/DAFTAR_KOMPONEN_LISENSI.md -o docs/DAFTAR_KOMPONEN_LISENSI.pdf
```

Alternatif tanpa instalasi tambahan: buka berkas ini di previewer Markdown
(mis. GitHub, VS Code, atau editor Markdown lain) lalu gunakan fitur
*Print → Save as PDF* dari browser.
