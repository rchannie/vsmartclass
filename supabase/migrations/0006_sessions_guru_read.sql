-- Guru tidak bisa melihat sesi siswa di Analytics (Trajectory Chart & Growth Bars
-- kosong) karena policy "sessions own" hanya mengizinkan user_id = auth.uid().
-- Tambahkan policy baca terpisah untuk guru, konsisten dengan pola di bloom_profiles.

drop policy if exists "sessions read by guru" on public.sessions;

create policy "sessions read by guru" on public.sessions
  for select to authenticated using (public.is_guru_of(workspace_id));
