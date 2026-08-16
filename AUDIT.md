# AUDIT.md — VSmartClass vs Proposal GEMASTIK XIX (PPL)

Audit dilakukan sebelum ada baris kode yang diubah (Fase 0). Judul karya acuan:
**"Sistem Evaluasi Adaptif dan Pemetaan Kognitif Berbasis Taksonomi Bloom dengan AI."**

> Catatan branding: repo saat ini menyebut dirinya untuk **"LIDM 2026"** di
> `README.md` dan `DEMO.md`. Task ini menyasar **GEMASTIK XIX**. Ini murni teks
> dokumentasi (tidak memengaruhi kode), diperbaiki di Fase 5 — lihat Asumsi §8.

## Ringkasan eksekutif

Fondasi aplikasi (auth, workspace, RBAC, generator soal, sesi adaptif, profil
Bloom, dashboard analitik, proyek) **sudah ada dan berfungsi**, bukan
kerangka kosong. Reviewer benar bahwa software belum sekompleks judulnya:
ada **satu klaim inti proposal yang sama sekali tidak diimplementasikan**
(justifikasi C4+/RF-11), **satu celah keamanan/desain yang proposal sendiri
akui sebagai batasan** (label Bloom per-opsi bisa diintip & jawaban tidak
divalidasi server-side), dan beberapa fitur "kedalaman" yang diminta belum
ada (miskonsepsi, spaced review, ekspor laporan, rate limiting Gemini).
Pengujian baru unit test logika inti (32 test, 3 file) — belum ada
integration test maupun E2E, dan library-nya (RTL/Playwright) belum
terpasang.

Baseline saat ini: `npm run build` ✅ hijau, `npm test` ✅ 32/32 lulus,
`npm run lint` ✅ bersih, tidak ada LICENSE file.

---

## 1. Peta fitur vs klaim proposal

Legenda: ✅ Ada & berfungsi · 🟡 Parsial · ❌ Belum ada

### Modul 1 — Manajemen Pengguna & Workspace
| Klaim | Status | Bukti |
|---|---|---|
| Registrasi/login guru & siswa via Supabase Auth (JWT) | ✅ | `src/lib/api.js:66-124`, `src/stores/auth.js` |
| Guru buat kelas + kode undangan | ✅ | `createWorkspace` di `api.js:174`, `Dashboard.jsx` `WorkspacePanel` |
| Siswa gabung via kode (anti self-elevation, anti sesi basi) | ✅ | RPC `join_workspace_by_code` (`migrations/0004_join_rpc.sql`) — `security definer`, role ditentukan server-side |
| RLS ketat antar-kelas | ✅ (lihat §3) | `is_member`/`is_guru_of` helper + policy per tabel |
| RBAC route-level (guru vs siswa) | ✅ | `ProtectedRoute.jsx` — redirect otomatis bila role tak cocok |

Modul ini paling matang di codebase — tidak ada gap berarti.

### Modul 2 — Smart Question Generator
| Klaim | Status | Bukti |
|---|---|---|
| Guru isi parameter (mapel, topik, jenjang, jumlah, tipe, target Bloom) | ✅ | `QuestionGenerator.jsx` |
| Gemini generate PG & Esai | ✅ | `supabase/functions/generate-questions/index.ts`, model `gemini-2.5-flash`, temp 0.7 |
| Setiap opsi PG diberi label Bloom C1–C6 (bukan 1 kunci) | ✅ (tapi lihat §2 keamanan) | prompt mewajibkan tiap opsi punya `bloom` berbeda; skema `questions.options jsonb` |
| Setiap opsi punya umpan balik formatif | ✅ | field `feedback` per opsi, dirender di `Session.jsx` `FeedbackModal` |
| Esai + rubrik per level | ✅ | `rubric: [{bloom, desc}]`, dipakai `evaluate-essay` |

Fungsional, tapi **lihat temuan keamanan §2** — implementasi ini adalah
sumber celah paling serius di aplikasi.

### Modul 3 — Bloom-Based Evaluation & Adaptive Difficulty Engine (INTI)
| Klaim | Status | Bukti |
|---|---|---|
| PG: mapping opsi→label Bloom | ✅ (client-trust, lihat §2) | `session.js` `next()` baca `s.picked.bloom` langsung dari objek opsi yang datang dari DB |
| Esai: `evaluate-essay` (Gemini temp 0.3) → level + feedback naratif | ✅ | `supabase/functions/evaluate-essay/index.ts` |
| **Justifikasi C4+ (RF-11)**: siswa tulis alasan untuk C5/PG bernalar C4+, dievaluasi AI | ❌ **TIDAK ADA** | tidak ada field input, tidak ada edge function `evaluate-justification`, tidak ada kolom di skema. Ini klaim proposal yang paling signifikan dan sama sekali belum diwujudkan. |
| Adaptasi mikro intra-sesi: streak 2x sukses → naik 1 level; gagal → turun seketika | ✅ | `bloom.js:64-75 adaptNext()`, diuji `bloom.test.js` |
| State Zustand + live snapshot | ✅ | `stores/session.js`, `updateLiveBloomSnapshot()` di `api.js:417` (fire-and-forget per jawaban) |
| Adaptasi makro antar-sesi: EWMA `new = old*0.6 + evidence*100*0.4` | ✅ | duplikasi identik di `demo.js:337 computeProfileUpdate()` dan `update-bloom-profile/index.ts:40-51` — **logika sama dihitung ulang di 2 tempat**, berisiko drift |
| `current_level` = level tertinggi dengan `c_n >= 60` | ✅ | sama, kedua tempat |
| Kalibrasi awal mulai C3, sesi = 6 soal | ✅ | `session.js:22 SESSION_LENGTH=6`, `Session.jsx` deteksi `isDiagnostic` |
| Pre-generation buffer lintas level + fallback + loading state | 🟡 **parsial** | hanya **prefetch 1 soal ke depan** (`session.js:75-88`, `confirmChoice()`), bukan buffer kandidat multi-level. Fallback ada (`nextQuestion` di `api.js:371-397`: bank→AI→demo generator lokal). Loading state ada (`AIThinking`). |
| Rate limiting / queue kuota Gemini | ❌ **TIDAK ADA** | tidak ditemukan di `generate-questions`, `evaluate-essay`, atau `get-recommendations` — pemanggilan langsung tanpa throttle/queue/backoff |

**Ini adalah modul dengan gap terbesar** relatif terhadap judul karya: mesin
adaptifnya nyata dan teruji, tapi 2 elemen "kedalaman" yang eksplisit
diklaim proposal (justifikasi bernalar, rate limiting produksi) belum ada.

### Modul 4 — Personalized Recommendation
| Klaim | Status | Bukti |
|---|---|---|
| Siswa: identifikasi level terlemah → 3 aktivitas prioritas (ZPD/pondasi dulu) | ✅ | `recs.js buildStudentRecs()`, diuji `recs.test.js` (skenario A/B) |
| Disajikan sesuai VARK (V/A/R/K) | ✅ | `VarkSurvey.jsx` (4 pertanyaan → gaya dominan), `get-recommendations/index.ts:44-51` menyisipkan `varkLine` ke prompt Gemini |
| + challenge question | ✅ | field `challengeQuestion` di rec card & prompt Gemini |
| Guru: distribusi `current_level` kelas → 1 dari 4 strategi | ✅ | `pickClassStrategy()` di `recs.js:137-146`, diuji, dirender `Recommendations.jsx` (guru) |

Modul ini solid dan sudah sesuai klaim, termasuk fallback template bila
Gemini gagal (`get-recommendations/index.ts:18-22` `FALLBACK`).

### Modul 5 — Bloom Analytics Dashboard
| Klaim | Status | Bukti |
|---|---|---|
| Realtime | ✅ | `useRealtime.js` — Supabase Realtime channel di produksi, `CustomEvent` di mode demo |
| Stat Cards | ✅ | `getClassStats()` di `api.js:525-555` |
| Class Heatmap (level × topik) | ✅ | `ClassHeatmap.jsx` (CSS grid, bukan chart library) |
| Trajectory (per sesi per siswa) | ✅ | `TrajectoryChart.jsx` + `sessions` table |
| Growth Stacked Bars | ✅ | `GrowthBars.jsx`, window 4 minggu |
| Bloom Radar (6 sumbu) | ✅ | `BloomRadar.jsx` (Recharts) |
| Tabel aktivitas + status intervensi (on-track/plateau/perlu perhatian) | ✅ | `statusOf()` di `bloom.js:146-151`, diuji, dirender `Analytics.jsx` tabel |
| Pemetaan **per-topik** (bukan skor tunggal) | ✅ | `bloom_profiles` unique per `(user_id, workspace_id, topic)` — sudah granular per topik |

Modul paling lengkap secara visual. Gap-nya bukan fitur hilang, tapi
**aksesibilitas** (lihat §6) — chart Recharts & heatmap tidak punya teks
alternatif/ARIA untuk pembaca layar.

### Modul 6 — Project Submission
| Klaim | Status | Bukti |
|---|---|---|
| Upload laporan PDF/Word ≤10MB sebagai bukti C6 | ✅ | `ProjectSubmit.jsx`, `MAX_SIZE_MB=10`, `ACCEPTED='.pdf,.doc,.docx'` |
| Hanya terbuka setelah C6 tercapai | ✅ | `hasReachedC6` check, `migrations/0005_project_storage.sql` |
| Notifikasi ke guru | 🟡 **parsial** | guru melihat submission di `ProjectReports.jsx` (list + unduh), tapi **tidak ada notifikasi aktif** (in-app banner, email, atau badge) — guru harus membuka menu untuk tahu ada laporan baru |
| Guru tinjau & **beri nilai** | 🟡 **parsial** | guru bisa meninjau & mengunduh (`ProjectReports.jsx`), **tidak ada field skor/nilai/status review** di skema (`project_submissions` tidak punya kolom `score`/`grade`/`reviewed_at`/`teacher_feedback`) maupun UI untuk memberi nilai |

---

## 2. Temuan keamanan/desain kritis

### 2.1 GEMINI_API_KEY — AMAN ✅
`.env` klien hanya berisi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_SUPABASE_PUBLISHABLE_KEY`. `GEMINI_API_KEY` hanya direferensikan lewat
`Deno.env.get('GEMINI_API_KEY')` di 3 Edge Function
(`generate-questions`, `evaluate-essay`, `get-recommendations`) dan tidak
pernah dikirim ke klien. `src/lib/gemini.js` (`invokeEdge`) adalah
satu-satunya jalur pemanggilan AI dari frontend, selalu lewat
`supabase.functions.invoke`. **Tidak ada pelanggaran di sini.**

### 2.2 Label Bloom per-opsi bocor ke klien — CELAH NYATA ❌ (ini proposal sendiri sebut sebagai batasan yang harus ditutup)
`questions.options` (jsonb, termasuk field `bloom` per opsi) disimpan apa
adanya dan **dapat dibaca penuh oleh siswa** begitu `published = true`,
lewat RLS policy:

```sql
create policy "questions read" on public.questions
  for select to authenticated using (
    created_by = auth.uid() or (published and public.is_member(workspace_id))
  );
```

Policy ini benar secara RLS (siswa memang boleh baca soal published), tapi
**tidak ada pemisahan kolom** — `select('*')` di `getQuestions()`
(`api.js:261-277`) mengembalikan `options` lengkap dengan label Bloom
setiap opsi ke browser **sebelum siswa menjawab**. Siapa pun bisa
membuka DevTools → Network/Console → melihat response
`supabase.from('questions').select('*')` dan langsung tahu opsi mana
mewakili C1 vs C6, mengalahkan tujuan "tidak ada jawaban salah, sistem
membaca cara berpikirmu" dan berpotensi digunakan untuk menyetir profil
Bloom secara sengaja.

**Lebih jauh**, `session.js:121 next()` menghitung `bloomChosen` = 
`s.picked.bloom` — **string yang datang dari objek opsi yang sama yang
sudah ada di klien**, lalu ditulis ke `session_answers.bloom_chosen` lewat
`recordAnswer()` tanpa validasi server. Server (`update-bloom-profile`
Edge Function) mempercayai begitu saja nilai `bloom_chosen` yang dikirim
klien saat menghitung EWMA. Artinya siswa (atau siapa pun yang bisa
memanggil REST API dengan token valid) bisa **mem-forge** `bloom_chosen`
langsung ke `C6` tanpa pernah benar-benar menjawab dengan bernalar tinggi,
karena RLS `"answers own"` hanya memvalidasi kepemilikan sesi, bukan
konsistensi nilai.

**Ini dua masalah berbeda yang saling memperkuat:**
1. Kerahasiaan: opsi→Bloom seharusnya tidak terlihat sebelum submit.
2. Integritas: server harus jadi sumber kebenaran untuk `bloom_chosen`,
   bukan menerima apa pun yang dikirim klien.

Rencana perbaikan (Fase 2, lihat §7): pindahkan validasi jawaban PG ke
Edge Function baru (mis. `submit-answer`) yang menyimpan `option_id` dari
klien, mencocokkannya ke `questions.options` **di server** (via service
role, tidak lewat RLS klien), dan menuliskan `bloom_chosen` hasil lookup
server sendiri. Opsi jangka pendek yang lebih murah: buat **view/RPC**
`get_question_for_student(id)` yang men-strip field `bloom`/`feedback`
dari opsi sebelum sesi dimulai, dan kirim `feedback`+`bloom` hanya untuk
opsi yang benar-benar dipilih (via RPC terpisah setelah submit).

### 2.3 RLS — kualitas keseluruhan: baik, dengan 1 gap kecil
- Helper `is_member`/`is_guru_of` pakai `security definer` untuk
  menghindari policy rekursif — pola yang benar.
- `bloom_profiles` sengaja **tanpa policy insert/update untuk role
  `authenticated`** — penulisan hanya lewat Edge Function service role.
  Ini desain yang tepat untuk data yang harus dipercaya.
- `join_workspace_by_code` RPC `security definer` mencegah self-elevation
  role saat bergabung kelas — bagus.
- Storage policy `project-files` memvalidasi folder path
  `{workspace_id}/{user_id}/...` — konsisten dengan RLS tabel.
- **Gap**: `sessions`/`session_answers` tidak divalidasi kontennya (lihat
  §2.2) — RLS hanya menjamin kepemilikan baris, bukan kebenaran nilai.
- **Gap dokumentasi**: `supabase/setup.sql` (skrip all-in-one) **tidak
  memuat RPC `join_workspace_by_code`** (migrasi 0004) meski komentarnya
  bilang "gabungan migrations 0001–0003" — jika dijalankan sendirian,
  fitur gabung kelas akan gagal total. `README.md` juga hanya menyuruh
  menjalankan `0001_schema.sql`, mengabaikan 0002–0007. Lihat §5.

---

## 3. Skema database aktual vs yang diklaim

| Tabel diklaim | Ada? | Catatan |
|---|---|---|
| `profiles` | ✅ | + `vark_style`, trigger otomatis `handle_new_user` |
| `workspaces` | ✅ | + `join_code` unique |
| `questions` | ✅ | + `options`/`rubric` jsonb — **lihat §2.2 soal eksposur** |
| `sessions` | ✅ | |
| `session_answers` | ✅ | **tidak ada validasi server terhadap `bloom_chosen`** |
| `bloom_profiles` | ✅ | per-topik (bukan skor tunggal) — sesuai klaim "pemetaan kognitif" |
| `project_submissions` | ✅ | **tidak ada kolom nilai/status review** (lihat Modul 6) |

Tabel tambahan yang tidak eksplisit disebut proposal tapi diperlukan dan
sudah ada: `workspace_members` (relasi many-to-many + role).

Tidak ada tabel untuk: **miskonsepsi/pola kesalahan**, **spaced review
queue**, **justifikasi jawaban** — karena fitur-fiturnya memang belum ada
(§1, §7).

---

## 4. Daftar mock/placeholder/TODO

- Tidak ditemukan komentar `TODO`/`FIXME`/`XXX` di `src/` maupun
  `supabase/` — kode yang ada sudah "selesai" untuk cakupannya, bukan
  setengah jadi. Gap yang ditemukan adalah **fitur yang tidak ada sama
  sekali**, bukan stub kosong.
- Mode demo (`src/lib/demo.js`) sengaja meniru Edge Function 1:1
  (`computeProfileUpdate` identik dengan `update-bloom-profile`) — ini
  bukan mock yang menyesatkan, tapi **duplikasi logika** yang berisiko
  drift kalau salah satu diubah tanpa yang lain (lihat §7 Fase 1: pindahkan
  ke `src/lib/config.js`/shared constants sejauh mungkin, meski Edge
  Function Deno tidak bisa import langsung dari `src/`).
- `supabase/migrations/0007_demo_prep.sql` meng-hardcode nilai
  `bloom_profiles` untuk `citra@siswa.com` demi keperluan rekaman demo
  — valid untuk keperluan lomba, tapi harus didokumentasikan jelas sebagai
  "jangan dijalankan di kelas produksi sungguhan" (saat ini tidak ada
  peringatan seperti itu di file maupun README).

---

## 5. Dokumentasi & housekeeping

- **LICENSE**: tidak ada file `LICENSE` di root meski `package.json`
  tersirat MIT (tidak eksplisit disebut) dan proposal menyatakan lisensi
  MIT. → Fase 5.
- **README setup instructions tidak lengkap**: hanya menyebut
  `0001_schema.sql`, padahal aplikasi butuh migrasi 0002 (trigger profil),
  0003 (RLS repair — tidak wajib jika 0001 dijalankan bersih, tapi aman),
  0004 (RPC join — **wajib**, tanpa ini gabung kelas rusak), 0005 (storage
  bucket proyek — wajib untuk Modul 6), 0006 (guru baca sesi — wajib untuk
  Analytics Trajectory/Growth). → Fase 5, rekomendasi: arahkan pengguna ke
  `supabase/setup.sql` sebagai satu-satunya entry point setelah
  `join_workspace_by_code` ditambahkan ke dalamnya (Fase 2).
- **Branding**: "LIDM 2026" di `README.md:4` dan seluruh `DEMO.md` — perlu
  diselaraskan ke GEMASTIK XIX (Asumsi §8).
- Tidak ada `CHANGES.md` (diminta Fase 5).
- Bundle size: `npm run build` menghasilkan 1 chunk 940 KB (269 KB gzip) —
  bukan blocker fungsional, tapi Vite sudah memperingatkan; layak
  dipertimbangkan `code-splitting` bila ada waktu (di luar scope wajib).

---

## 6. Pengujian & aksesibilitas — baseline sebelum Fase 3/4

- **Unit test**: 3 file, 32 test, semua lulus (`vitest`). Cakupan:
  `adaptNext` (streak), `computeProfileUpdate` (EWMA blend, ambang 60,
  anti-lonjakan, tren, session_count), `buildStudentRecs`/
  `pickClassStrategy`. **Tidak ada test untuk**: `statusOf` edge case
  tambahan, util lain di `bloom.js` (`difficultyTierOf` sudah ada),
  store Zustand (`session.js`, `auth.js`, `workspace.js`) — belum ada test
  sama sekali untuk state machine sesi.
- **Integration test**: ❌ tidak ada. Tidak ada mock Supabase/Gemini untuk
  menguji alur generate→jawab→update profil→dashboard end-to-end.
- **E2E**: ❌ tidak ada, Playwright belum terpasang (`package.json` devDeps
  tidak memuatnya).
- **Test keamanan RLS**: ❌ tidak ada test otomatis yang memverifikasi
  siswa tidak bisa baca data siswa/kelas lain.
- **React Testing Library**: belum terpasang — dibutuhkan untuk
  integration test komponen di Fase 3.
- **Coverage tooling**: `vitest` mendukung `--coverage` tapi package
  `@vitest/coverage-v8` (atau istanbul) belum ada di devDependencies dan
  script `test:coverage` belum ada di `package.json`.
- **Aksesibilitas**: belum ada audit formal. Temuan cepat dari pembacaan
  kode: `ClassHeatmap.jsx` memakai `<div>` dengan `title` attr (tidak
  reachable keyboard, tidak terbaca screen reader dengan baik) untuk data
  heatmap; `BloomRadar.jsx`/Recharts tidak punya `role="img"` +
  `aria-label` ringkasan; belum diverifikasi kontras warna token
  `--c1`..`--c6` terhadap WCAG AA 4.5:1. Audit axe/Lighthouse formal
  dijadwalkan Fase 4.

---

## 7. Rencana perbaikan (ringkas, per fase — detail dieksekusi setelah audit ini disetujui)

**Fase 1 (fitur inti):**
1. Implementasikan justifikasi C4+/RF-11: field input alasan singkat untuk
   soal C5 & PG bernalar C4+, edge function baru `evaluate-justification`
   (Gemini) yang menilai apakah justifikasi benar-benar menunjukkan level
   kognitif tsb, integrasi ke `session.js` state machine.
2. Sesi diagnostik awal — **sudah ada**, tidak perlu dikerjakan ulang,
   hanya perlu dipastikan tidak rusak oleh perubahan lain.
3. Tambahkan: penandaan pola kesalahan/miskonsepsi per topik (tabel baru
   ringan, mis. agregasi dari `session_answers` yang levelnya turun),
   spaced review (antrian topik lemah yang belum di-review > N hari),
   ekspor CSV/PDF laporan kelas untuk guru.
4. Buat `src/lib/config.js` untuk hyperparameter (bobot 0.6/0.4, ambang 60,
   streak 2) — dipakai `bloom.js`/`demo.js`/direferensikan di dokumentasi
   Edge Function (Deno tidak bisa import file `src/`, jadi nilainya harus
   disalin manual dengan komentar "harus sinkron dengan `src/lib/config.js`").
5. Rate limiting/queue sederhana untuk Edge Function Gemini (mis. token
   bucket per user_id disimpan di tabel/Deno KV, atau minimal debounce
   + retry-with-backoff pada 429).

**Fase 2 (perancangan):**
1. Tutup celah §2.2 — pindahkan validasi jawaban PG ke server.
2. Rapikan migrasi jadi satu sumber kebenaran idempoten (tambahkan RPC
   join ke `setup.sql`, atau jadikan migrations/ folder satu-satunya
   sumber dan `setup.sql` di-generate/dikonsolidasi darinya).
3. `docs/ARCHITECTURE.md` + diagram mermaid (ERD, sequence "siswa jawab
   soal", state machine adaptasi).

**Fase 3 (pengujian):** target coverage ≥80%, tambah RTL + Playwright,
test RLS, perbaiki bug yang ditemukan (termasuk kemungkinan bug baru dari
perubahan Fase 1–2).

**Fase 4 (a11y):** axe/Lighthouse pada alur inti, perbaiki kontras/ARIA/
keyboard nav, catat skor sebelum/sesudah.

**Fase 5 (laporan):** README lengkap, CHANGES.md, LICENSE MIT.

---

## 8. Asumsi (diputuskan sendiri, solusi paling sederhana yang benar)

1. **Branding LIDM→GEMASTIK**: akan diselaraskan ke "GEMASTIK XIX — divisi
   Pengembangan Perangkat Lunak" di README/DEMO pada Fase 5. Tidak
   mengubah struktur data/kode, murni teks.
2. **Justifikasi C4+ (RF-11)** akan diterapkan sebagai: textarea wajib
   (≥1 kalimat, minimal panjang mirip pola `EssayInput` yang sudah ada)
   yang muncul setelah siswa memilih opsi PG dengan `bloom >= C4` **atau**
   untuk semua soal esai bertarget C5, dievaluasi Edge Function baru yang
   bisa menolak (downgrade level) jika justifikasi tidak konsisten dengan
   opsi yang dipilih. Tidak memblokir submit bila AI gagal (fallback:
   terima level dari opsi/essay seperti sekarang, catat justifikasi tanpa
   evaluasi).
3. **Grading proyek (Modul 6)**: menambah kolom minimal
   `score numeric`, `teacher_feedback text`, `reviewed_at timestamptz`
   pada `project_submissions` + UI form nilai sederhana di
   `ProjectReports.jsx` — bukan rubrik kompleks, karena proposal hanya
   bilang "tinjau & beri nilai" tanpa spesifikasi rubrik.
4. **Rate limiting Gemini**: cukup implementasi ringan (in-memory/Deno KV
   token bucket per `user_id` + retry-backoff pada error 429), bukan
   infrastruktur queue eksternal (mis. tidak akan menambah Redis/BullMQ)
   — proporsional dengan skala aplikasi kompetisi.
5. **Pre-generation buffer** akan diperluas dari 1-ahead menjadi
   prefetch beberapa kandidat lintas 2-3 level terdekat saat sesi dimulai,
   bukan generate seluruh pohon kemungkinan level di muka (biaya Gemini
   tidak proporsional) — tetap menjaga transisi instan untuk kasus umum.
6. **Framework test**: instruksi menyebut "Jest + RTL", tapi repo sudah
   memakai **Vitest** (kompatibel API dengan Jest, lebih cepat dg Vite).
   Akan tetap pakai Vitest + tambah `@testing-library/react` di atasnya,
   bukan migrasi ke Jest — mengganti test runner yang sudah berfungsi baik
   tanpa alasan teknis akan menambah risiko tanpa manfaat.
7. Tidak akan mengubah gaya visual/warna/copy Bahasa Indonesia yang sudah
   ada kecuali untuk menambahkan elemen baru (mis. input justifikasi,
   form nilai proyek) — mengikuti batasan eksplisit di brief.
