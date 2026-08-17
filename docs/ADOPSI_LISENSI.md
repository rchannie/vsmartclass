# Adopsi Lisensi VSmartClass (GEMASTIK XIX, Pengembangan Perangkat Lunak)

## a) Lisensi yang Diadopsi

VSmartClass dirilis di bawah **MIT License** (SPDX: `MIT`).

- **Pemegang hak cipta**: Tim Carcircur Ariel Hidayatul Faqih, Muhammad
  Raditya Santosa, Khairatul Husna Tartila (Universitas Pendidikan
  Indonesia).
- **Tahun**: 2026.
- **Repositori**: [github.com/rchannie/vsmartclass](https://github.com/rchannie/vsmartclass).

Baris hak cipta di atas identik dengan yang tertulis di berkas
[`LICENSE`](../LICENSE) pada root repositori lihat §f) Lokasi Artefak.

## b) Alasan Pemilihan

MIT dipilih karena:

1. **Permisif** mengizinkan penggunaan, penyalinan, modifikasi,
   penggabungan, publikasi, distribusi, sublisensi, dan/atau penjualan
   salinan perangkat lunak secara bebas, selama pemberitahuan hak cipta dan
   izin dipertahankan. Ini mendukung semangat lomba GEMASTIK sebagai ajang
   pengembangan perangkat lunak open-source: sekolah, institusi pendidikan,
   atau tim lain bebas mengadopsi, memodifikasi, dan mereplikasi
   VSmartClass untuk kebutuhan pembelajaran mereka sendiri tanpa hambatan
   lisensi.
2. **Ringan secara kepatuhan** hanya mewajibkan penyertaan ulang teks
   lisensi & pemberitahuan hak cipta pada salinan/turunan; tidak ada
   kewajiban *copyleft* (tidak mewajibkan kode turunan ikut dibuka sebagai
   open-source), tidak ada kewajiban paten eksplisit yang rumit seperti
   Apache-2.0.
3. **Kompatibel dengan seluruh dependensi proyek** seluruh komponen
   pihak ketiga langsung yang dipakai VSmartClass (frontend maupun Edge
   Function) berlisensi permisif setara (MIT/Apache-2.0/ISC/BSD/
   PostgreSQL lihat §e). Tidak ada benturan lisensi antara kode aplikasi
   dan dependensinya.

## c) Ruang Lingkup

Lisensi MIT ini mencakup **seluruh kode sumber aplikasi** pada repositori
[github.com/rchannie/vsmartclass](https://github.com/rchannie/vsmartclass):

- Frontend (React 19 + Vite + Tailwind + Zustand + Recharts) di `src/`.
- Backend Supabase Edge Functions (Deno/TypeScript) di `supabase/functions/`.
- Skema & migrasi basis data (`supabase/migrations/`, `supabase/setup.sql`).
- Dokumentasi proyek (`README.md`, `docs/`, dsb.).

**Tidak tercakup** dalam lisensi ini:

- **Layanan pihak ketiga** yang diakses lewat API saat aplikasi berjalan —
  terutama **Google Gemini 2.5 Flash** (Generative Language API), yang
  tunduk pada [Google APIs Terms of Service](https://developers.google.com/terms)
  miliknya sendiri, bukan MIT. VSmartClass hanya memanggil API ini dari
  Edge Function; tidak ada kode Gemini yang didistribusikan bersama
  repositori ini.
- Platform terkelola (Supabase, Vercel) yang dipakai sebagai layanan hosting/
  backend, bukan kode yang di-*bundle*.
- Komponen pihak ketiga open-source yang di-*install* sebagai dependensi
  (lihat §e) masing-masing tetap tunduk pada lisensinya sendiri, terlepas
  dari lisensi MIT yang mengatur kode VSmartClass sendiri.

## d) Kepatuhan Lisensi Pihak Ketiga

Seluruh komponen open-source langsung yang dipakai VSmartClass —
baik di frontend, *tooling* pengujian, maupun Edge Function berlisensi
**permisif** (MIT, Apache-2.0, ISC, BSD-2-Clause/BSD-3-Clause, PostgreSQL).
**Tidak ditemukan lisensi copyleft kuat** (GPL/AGPL/LGPL) di seluruh 378
paket (langsung maupun transitif) yang diperiksa. Pemberitahuan hak cipta
tiap komponen dipertahankan lewat metadata paket (`package.json`/
`package-lock.json`) masing-masing dan tidak diubah oleh proyek ini.

Satu temuan yang dilaporkan apa adanya (bukan disembunyikan): empat paket
**devDependency** (`@axe-core/playwright`, `axe-core`, `lightningcss`, dan
`dompurify` yang dual-lisensi) berlisensi **MPL-2.0** (*copyleft* lemah,
berbasis-berkas) seluruhnya alat bantu pengujian/build yang tidak pernah
ikut ter-*bundle* ke aplikasi yang didistribusikan, sehingga tidak
memengaruhi lisensi MIT kode VSmartClass sendiri.

Daftar lengkap per-komponen (nama, versi persis dari lockfile, peran,
lisensi SPDX) termasuk rincian temuan di atas didokumentasikan sebagai
lampiran resmi terpisah: **[`docs/DAFTAR_KOMPONEN_LISENSI.md`](DAFTAR_KOMPONEN_LISENSI.md)**
(tidak diulang di sini agar dokumen ini tetap ringkas).

## e) Lokasi Artefak

| Artefak | Lokasi |
|---|---|
| Teks lisensi lengkap | [`LICENSE`](../LICENSE) root repositori |
| Deklarasi mesin-terbaca | `"license": "MIT"` di [`package.json`](../package.json) |
| Rujukan di dokumentasi utama | Bagian "Lisensi" di [`README.md`](../README.md) |
| Daftar komponen & lisensi pihak ketiga | [`docs/DAFTAR_KOMPONEN_LISENSI.md`](DAFTAR_KOMPONEN_LISENSI.md) + bukti mentah [`docs/licenses-raw.csv`](licenses-raw.csv) |

**Catatan cakupan**: header lisensi per-berkas (mis. komentar SPDX di
setiap file `.js`/`.jsx`/`.ts`) **belum** diterapkan ke source files
individual bukan konvensi yang sudah berjalan di repositori ini, dan
menambahkannya ke ratusan berkas sekaligus berisiko tinggi/berlebihan untuk
manfaat yang didapat, mengingat satu berkas `LICENSE` di root + deklarasi
`package.json` sudah menjadi praktik standar yang sah dan cukup untuk
proyek MIT bergaya ini. **Rekomendasi lanjutan** (opsional, bukan blocker):
bila proyek ini dikembangkan lebih lanjut sebagai library yang di-*publish*
terpisah (mis. dipecah jadi paket npm), pertimbangkan menambah header SPDX
singkat (`// SPDX-License-Identifier: MIT`) di berkas entry point utama.

---

## f) Lampiran Teks Lengkap MIT License

Identik dengan isi berkas [`LICENSE`](../LICENSE) di root repositori.

```
MIT License

Copyright (c) 2026 Tim Carcircur Ariel Hidayatul Faqih, Muhammad Raditya Santosa, Khairatul Husna Tartila (Universitas Pendidikan Indonesia)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Mengekspor Dokumen Ini ke PDF

Berkas final GEMASTIK dikumpulkan dalam format PDF konversi cepat dengan
[Pandoc](https://pandoc.org/): `pandoc docs/ADOPSI_LISENSI.md -o docs/ADOPSI_LISENSI.pdf`