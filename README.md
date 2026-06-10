# VSmartClass

Collaborative Workspace bertenaga AI untuk pembelajaran adaptif berbasis
**Taksonomi Bloom (C1–C6)**. Karya lomba **LIDM 2026** — divisi Inovasi
Teknologi Digital Pendidikan.

## Tech Stack

React 19 + Vite · Tailwind CSS v3 · Zustand · React Query · React Router v6 ·
Supabase (PostgreSQL + Auth + Realtime + Edge Functions) · Gemini 1.5 Flash ·
Recharts · Lucide React

## Menjalankan (mode demo — tanpa backend)

```bash
npm install
npm run dev
```

Tanpa kredensial Supabase, aplikasi otomatis berjalan dalam **mode demo**:
data tersimpan di localStorage dan ter-seed sesuai data dummy LIDM.
Generator soal AI memakai template lokal (tanpa API key).

Akun demo:

| Peran | Email                  | Kata sandi |
| ----- | ---------------------- | ---------- |
| Guru  | ratna@sma3bdg.sch.id   | guru123    |
| Siswa | aisyah@siswa.com       | siswa123   |
| Siswa | dimas / citra / bagas / elsa @siswa.com | siswa123 |

Kode kelas demo: `VSC-7QK2` (XI MIPA 2 · SMA Negeri 3 Bandung).

> Mode demo bisa di-reset dengan menghapus key `vsc-demo-db-v1` di localStorage.

## Menjalankan dengan Supabase (produksi)

1. Buat proyek di [supabase.com](https://supabase.com), lalu jalankan
   `supabase/migrations/0001_schema.sql` di SQL Editor.
2. Buat akun-akun demo lewat Authentication, lalu jalankan `supabase/seed.sql`.
3. Deploy Edge Functions dan set secret Gemini:

   ```bash
   supabase functions deploy generate-questions update-bloom-profile get-recommendations
   supabase secrets set GEMINI_API_KEY=...
   ```

4. Salin `.env.example` → `.env` dan isi:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. `npm run dev` — aplikasi otomatis beralih dari mode demo ke Supabase.

## Struktur

```
src/
├── components/   bloom/ · charts/ · questions/ · ui/ · layout/
├── pages/        auth/ · guru/ · siswa/ · Join
├── stores/       auth · session (sesi adaptif) · workspace
├── hooks/        useBloomProfile · useClassData · useRealtime · useActiveWorkspace
├── lib/          supabase · gemini · bloom · api (lapisan data terpadu) · demo · recs
└── styles/       tokens.css (design tokens)
supabase/
├── migrations/   schema + RLS
├── seed.sql      data demo LIDM
└── functions/    generate-questions · update-bloom-profile · get-recommendations
```

## Catatan UX

- Tidak ada emoji di UI — ikon memakai Lucide.
- Warna Bloom selalu lewat token CSS `--c1`…`--c6`.
- "Tidak ada jawaban salah" — setiap opsi soal mewakili level kognitif berbeda
  dengan feedback formatif.
- Dark mode: toggle di sidebar (tersimpan di localStorage).
- Logo: letakkan `logo.png` (putih transparan) di `public/` — ditampilkan di
  dalam badge gradien teal→warm.
