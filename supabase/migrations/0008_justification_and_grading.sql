-- Fase 1 — melengkapi klaim proposal yang masih hilang (lihat AUDIT.md §1, §7):
--   1) RF-11: justifikasi tertulis untuk opsi PG bernalar C4+, dievaluasi AI.
--   2) Modul 6: guru bisa memberi nilai & catatan pada laporan proyek siswa,
--      bukan hanya meninjau.
--   3) Guru butuh akses baca session_answers untuk fitur "pola kesalahan/
--      miskonsepsi per topik" (Analytics) — sebelumnya hanya siswa pemilik
--      baris yang bisa membaca (RLS "answers own"), tidak ada policy guru.
-- Idempoten — aman dijalankan berulang.

-- ============================================================ KOLOM

alter table public.session_answers
  add column if not exists justification text,
  add column if not exists justification_verified boolean,
  add column if not exists justification_feedback text;

alter table public.project_submissions
  add column if not exists score numeric check (score >= 0 and score <= 100),
  add column if not exists teacher_feedback text,
  add column if not exists reviewed_at timestamptz;

-- ============================================================ RLS

drop policy if exists "answers read by guru" on public.session_answers;
create policy "answers read by guru" on public.session_answers
  for select to authenticated using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_guru_of(s.workspace_id)
    )
  );

drop policy if exists "projects review by guru" on public.project_submissions;
create policy "projects review by guru" on public.project_submissions
  for update to authenticated
  using (public.is_guru_of(workspace_id))
  with check (public.is_guru_of(workspace_id));
