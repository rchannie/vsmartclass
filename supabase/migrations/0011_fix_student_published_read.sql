-- Migration: Izinkan siswa (member workspace) membaca soal published langsung
-- dari tabel questions. Ini menyelesaikan masalah di mana RPC
-- get_published_questions tidak mengembalikan soal baru kepada siswa.
--
-- PENTING: Jalankan SQL ini di Supabase Dashboard > SQL Editor

-- Tambah policy READ untuk siswa member workspace (hanya soal published)
drop policy if exists "questions read published member" on public.questions;
create policy "questions read published member" on public.questions
  for select to authenticated using (
    published = true and public.is_member(workspace_id)
  );

-- Re-create RPC get_published_questions (pastikan versi terbaru)
create or replace function public.get_published_questions(p_workspace_id uuid, p_topic text default null)
returns table (
  id            uuid,
  workspace_id  uuid,
  subject       text,
  topic         text,
  type          text,
  bloom_target  text[],
  prompt        text,
  rubric        jsonb,
  options       jsonb,
  published     boolean,
  created_at    timestamptz
)
language sql security definer stable
set search_path = public
as $$
  select
    q.id, q.workspace_id, q.subject, q.topic, q.type, q.bloom_target, q.prompt, q.rubric,
    case when q.type = 'mcq' then (
      select jsonb_agg(jsonb_build_object('id', opt->>'id', 'text', opt->>'text') order by opt->>'id')
      from jsonb_array_elements(q.options) as opt
    ) else null end as options,
    q.published, q.created_at
  from public.questions q
  where q.published = true
    and q.workspace_id = p_workspace_id
    and (p_topic is null or q.topic = p_topic)
    and public.is_member(p_workspace_id);
$$;

revoke execute on function public.get_published_questions(uuid, text) from public, anon;
grant execute on function public.get_published_questions(uuid, text) to authenticated;
