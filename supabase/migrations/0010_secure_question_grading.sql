-- Fase 2 — menutup celah label Bloom PG yang bisa diintip via DevTools
-- (AUDIT.md §2.2). Sebelumnya siswa bisa membaca questions.options APA
-- ADANYA (termasuk field bloom/indicator/feedback tiap opsi) begitu soal
-- published, lewat policy "questions read". Sekarang:
--
--   * Akses PENUH ke base table questions (semua kolom) HANYA untuk guru
--     workspace (public.is_guru_of) — guru memang perlu melihat kunci
--     jawaban untuk meninjau/mengedit soal sebelum publish.
--   * Siswa membaca daftar topik soal published lewat RPC
--     get_published_questions() yang mengembalikan opsi TERSANITASI
--     (hanya id+text).
--   * Alur sesi adaptif (memilih soal berikutnya & mengungkap label opsi
--     yang dipilih) dipindah ke Edge Function get-next-question dan
--     reveal-mcq-option (service role, tidak tunduk RLS klien tapi
--     memvalidasi keanggotaan workspace secara manual).
--
-- Idempoten — aman dijalankan berulang.

drop policy if exists "questions read" on public.questions;
drop policy if exists "questions read full guru" on public.questions;
create policy "questions read full guru" on public.questions
  for select to authenticated using (
    public.is_guru_of(workspace_id)
  );

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
