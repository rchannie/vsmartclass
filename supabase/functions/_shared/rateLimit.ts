// Dipakai bersama oleh tiap Edge Function yang memanggil Gemini — rate
// limiting sederhana per pengguna agar satu akun tidak bisa menghabiskan
// kuota API lewat spam/loop. Window tetap (bukan sliding), disimpan di
// tabel public.ai_usage (lihat migrations/0009_rate_limiting.sql).
//
// Ini BUKAN queue terdistribusi/multi-region — cukup proporsional untuk
// skala aplikasi kompetisi (satu region Supabase), bukan produksi besar.
// Folder ini diawali "_" sehingga tidak ikut ter-deploy sebagai fungsi
// tersendiri, hanya diimpor lewat path relatif oleh fungsi lain.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const WINDOW_MS = 60_000 // jendela 1 menit
const MAX_PER_WINDOW = 8 // panggilan Gemini per user per menit

export async function checkRateLimit(supabase: SupabaseClient, userId: string | null) {
  // Tanpa identitas user (jarang terjadi — semua fungsi produksi mewajibkan JWT)
  // tidak bisa dibatasi per-user di layer ini; lolos, tapi tetap dicatat di log.
  if (!userId) return { allowed: true }

  const now = Date.now()
  const { data: row } = await supabase
    .from('ai_usage')
    .select('window_start, request_count')
    .eq('user_id', userId)
    .maybeSingle()

  const windowExpired = !row || now - new Date(row.window_start).getTime() > WINDOW_MS
  if (windowExpired) {
    await supabase
      .from('ai_usage')
      .upsert({ user_id: userId, window_start: new Date().toISOString(), request_count: 1 })
    return { allowed: true }
  }

  if (row.request_count >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - new Date(row.window_start).getTime())
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) }
  }

  await supabase
    .from('ai_usage')
    .update({ request_count: row.request_count + 1 })
    .eq('user_id', userId)
  return { allowed: true }
}

// Ekstrak user id dari JWT Authorization header (bila ada) — dipakai sebagai
// kunci rate limit yang tidak bisa dipalsukan lewat body request.
export async function getUserId(req: Request, supabase: SupabaseClient): Promise<string | null> {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!auth) return null
  const { data } = await supabase.auth.getUser(auth)
  return data.user?.id ?? null
}

export function rateLimitResponse(retryAfterMs: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Terlalu banyak permintaan AI dalam waktu singkat. Coba lagi sesaat lagi.',
      retryAfterMs,
    }),
    {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  )
}
