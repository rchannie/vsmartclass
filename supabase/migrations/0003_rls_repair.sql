-- Sinkronisasi ulang seluruh kebijakan RLS dengan skema acuan (0001).
-- Idempoten — aman dijalankan berulang. Pakai saat database live ternyata
-- tidak punya / beda policy dari repo (gejala: "new row violates row-level
-- security policy" padahal kode klien benar).

-- ============================================================ HELPERS
-- security definer agar kebijakan tidak rekursif

create or replace function public.is_member(ws uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.is_guru_of(ws uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = 'guru'
  );
$$;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_guru_of(uuid) to authenticated;

-- ============================================================ ENABLE RLS

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.bloom_profiles enable row level security;
alter table public.project_submissions enable row level security;

-- ============================================================ PROFILES

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

create policy "profiles read" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ============================================================ WORKSPACES

drop policy if exists "workspaces read member" on public.workspaces;
drop policy if exists "workspaces insert guru" on public.workspaces;
drop policy if exists "workspaces update owner" on public.workspaces;
drop policy if exists "workspaces delete owner" on public.workspaces;

create policy "workspaces read member" on public.workspaces
  for select to authenticated using (public.is_member(id) or true); -- lookup join code diizinkan
create policy "workspaces insert guru" on public.workspaces
  for insert to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'guru')
    and created_by = auth.uid()
  );
create policy "workspaces update owner" on public.workspaces
  for update to authenticated using (created_by = auth.uid());
create policy "workspaces delete owner" on public.workspaces
  for delete to authenticated using (created_by = auth.uid());

-- ============================================================ WORKSPACE_MEMBERS

drop policy if exists "members read" on public.workspace_members;
drop policy if exists "members join self" on public.workspace_members;
drop policy if exists "members update self" on public.workspace_members;
drop policy if exists "members remove" on public.workspace_members;

create policy "members read" on public.workspace_members
  for select to authenticated using (public.is_member(workspace_id));
create policy "members join self" on public.workspace_members
  for insert to authenticated with check (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
create policy "members update self" on public.workspace_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members remove" on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );

-- ============================================================ QUESTIONS

drop policy if exists "questions read" on public.questions;
drop policy if exists "questions insert guru" on public.questions;
drop policy if exists "questions update own" on public.questions;
drop policy if exists "questions delete own" on public.questions;

create policy "questions read" on public.questions
  for select to authenticated using (
    created_by = auth.uid() or (published and public.is_member(workspace_id))
  );
create policy "questions insert guru" on public.questions
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_guru_of(workspace_id)
  );
create policy "questions update own" on public.questions
  for update to authenticated using (created_by = auth.uid());
create policy "questions delete own" on public.questions
  for delete to authenticated using (created_by = auth.uid());

-- ============================================================ SESSIONS & ANSWERS

drop policy if exists "sessions own" on public.sessions;
drop policy if exists "answers own" on public.session_answers;

create policy "sessions own" on public.sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "answers own" on public.session_answers
  for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

-- ============================================================ BLOOM_PROFILES

drop policy if exists "bloom read" on public.bloom_profiles;

create policy "bloom read" on public.bloom_profiles
  for select to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
-- penulisan dilakukan Edge Function (service role) → tidak perlu policy insert/update

-- ============================================================ PROJECT_SUBMISSIONS

drop policy if exists "projects insert own" on public.project_submissions;
drop policy if exists "projects read" on public.project_submissions;

create policy "projects insert own" on public.project_submissions
  for insert to authenticated with check (user_id = auth.uid() and public.is_member(workspace_id));
create policy "projects read" on public.project_submissions
  for select to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
