-- VSmartClass — schema + Row Level Security
-- Jalankan via: supabase db push  (atau SQL editor di dashboard)

-- ============================================================ TABEL

create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  role        text check (role in ('guru', 'siswa')) not null default 'siswa',
  avatar_url  text,
  vark_style  text check (vark_style in ('V', 'A', 'R', 'K')),
  created_at  timestamptz default now()
);

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  school      text,
  join_code   text unique not null,
  created_by  uuid references public.profiles(id),
  subject     text,
  created_at  timestamptz default now()
);

create table if not exists public.workspace_members (
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  role          text check (role in ('guru', 'siswa')) not null,
  joined_at     timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  created_by    uuid references public.profiles(id),
  subject       text,
  topic         text,
  type          text check (type in ('mcq', 'essay')) not null default 'mcq',
  bloom_target  text[],
  prompt        text not null,
  options       jsonb,
  rubric        jsonb,
  published     boolean default false,
  created_at    timestamptz default now()
);

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  topic         text,
  subject       text,
  bloom_level   int check (bloom_level between 1 and 6),
  started_at    timestamptz default now(),
  completed_at  timestamptz,
  item_count    int default 0
);

create table if not exists public.session_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  question_id   uuid references public.questions(id) on delete set null,
  chosen_option text,
  bloom_chosen  text,
  bloom_target  text,
  answered_at   timestamptz default now()
);

create table if not exists public.bloom_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  topic         text,
  c1            int default 0,
  c2            int default 0,
  c3            int default 0,
  c4            int default 0,
  c5            int default 0,
  c6            int default 0,
  current_level int default 1,
  trend         int default 0,
  session_count int default 0,
  updated_at    timestamptz default now(),
  unique (user_id, workspace_id, topic)
);

create table if not exists public.project_submissions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  topic         text not null,
  file_name     text not null,
  file_size     bigint,
  description   text,
  submitted_at  timestamptz default now()
);

-- Realtime untuk heatmap live di dashboard guru
alter publication supabase_realtime add table public.bloom_profiles;
alter publication supabase_realtime add table public.sessions;

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

-- ============================================================ RLS

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.bloom_profiles enable row level security;
alter table public.project_submissions enable row level security;

-- profiles: nama boleh dibaca pengguna terautentikasi (untuk roster kelas)
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- workspaces: baca hanya anggota (atau lookup join_code); insert hanya guru
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

-- workspace_members
create policy "members read" on public.workspace_members
  for select to authenticated using (public.is_member(workspace_id));
create policy "members join self" on public.workspace_members
  for insert to authenticated with check (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
create policy "members remove" on public.workspace_members
  for delete to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );

-- questions: guru CRUD miliknya; siswa baca published di workspace-nya
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

-- sessions & answers: hanya milik sendiri
create policy "sessions own" on public.sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "answers own" on public.session_answers
  for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

-- bloom_profiles: siswa baca miliknya; guru baca semua anggota workspace-nya
create policy "bloom read" on public.bloom_profiles
  for select to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
-- penulisan dilakukan Edge Function (service role) → tidak perlu policy insert/update

-- project_submissions: siswa insert/baca miliknya; guru baca workspace-nya
create policy "projects insert own" on public.project_submissions
  for insert to authenticated with check (user_id = auth.uid() and public.is_member(workspace_id));
create policy "projects read" on public.project_submissions
  for select to authenticated using (
    user_id = auth.uid() or public.is_guru_of(workspace_id)
  );
