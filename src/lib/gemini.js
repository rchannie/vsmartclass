// Helper pemanggil Supabase Edge Functions (Gemini di sisi server).
// Frontend tidak pernah memegang GEMINI_API_KEY — semua lewat Edge Function.

import { supabase, isSupabaseConfigured } from './supabase'

export async function invokeEdge(name, body) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase belum dikonfigurasi — mode demo memakai generator lokal.')
  }
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    // FunctionsHttpError menyimpan Response di error.context — ambil detail
    // { error } yang dikirim Edge Function agar penyebab asli terlihat di UI.
    let detail = ''
    try {
      const ctx = await error.context?.json()
      detail = ctx?.error || ''
    } catch { /* body bukan JSON */ }
    throw new Error(detail || error.message || `Edge function ${name} gagal.`)
  }
  return data
}
