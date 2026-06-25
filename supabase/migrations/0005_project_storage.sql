-- Penyimpanan file laporan proyek (Modul 6) di Supabase Storage.
-- Sebelumnya hanya file_name/file_size yang tersimpan — file aslinya tidak
-- pernah diunggah sehingga guru tidak bisa membuka laporan siswa.

alter table public.project_submissions
  add column if not exists file_path text;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Path konvensi: {workspace_id}/{user_id}/{timestamp}_{filename}
-- storage.foldername(name) -> {workspace_id, user_id}

drop policy if exists "project files insert own" on storage.objects;
drop policy if exists "project files read" on storage.objects;

create policy "project files insert own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_member((storage.foldername(name))[1]::uuid)
  );

create policy "project files read" on storage.objects
  for select to authenticated using (
    bucket_id = 'project-files'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.is_guru_of((storage.foldername(name))[1]::uuid)
    )
  );
