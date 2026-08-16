-- Fase 1 — rate limiting kuota Gemini per pengguna. Dibaca/ditulis HANYA oleh
-- Edge Function lewat service role (lihat _shared/rateLimit.ts) — tidak ada
-- policy untuk role `authenticated`, jadi RLS menutup akses klien sepenuhnya
-- meski tabel aktif (pola sama dengan bloom_profiles).
-- Idempoten — aman dijalankan berulang.

create table if not exists public.ai_usage (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  window_start   timestamptz not null default now(),
  request_count  int not null default 0
);

alter table public.ai_usage enable row level security;
