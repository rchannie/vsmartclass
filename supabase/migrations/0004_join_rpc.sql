-- Gabung kelas via RPC security definer.
-- user_id dan role ditentukan SERVER-SIDE dari auth.uid() + profiles.role:
--   • kebal terhadap sesi/state klien yang basi (penyebab error RLS berulang)
--   • menutup celah self-elevation (klien tidak bisa memilih role sendiri)

create or replace function public.join_workspace_by_code(p_code text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  uid     uuid := auth.uid();
  ws      public.workspaces;
  my_role text;
begin
  if uid is null then
    raise exception 'Sesi tidak valid. Silakan masuk kembali.';
  end if;

  select * into ws
  from public.workspaces
  where upper(join_code) = upper(trim(p_code));

  if not found then
    raise exception 'Kode tidak ditemukan. Periksa kembali kode dari gurumu.';
  end if;

  select role into my_role from public.profiles where id = uid;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws.id, uid, coalesce(my_role, 'siswa'))
  on conflict (workspace_id, user_id) do nothing;

  return ws;
end;
$$;

revoke execute on function public.join_workspace_by_code(text) from public, anon;
grant execute on function public.join_workspace_by_code(text) to authenticated;
