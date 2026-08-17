// Edge Function: reveal-mcq-option
// Input : { questionId, optionId }
// Output: { bloom, feedback, indicator }  — HANYA untuk opsi yang diminta
//
// Dipanggil tepat setelah siswa mengklik "Kirim jawaban" di sesi adaptif.
// Sebelum ini, klien hanya memegang { id, text } per opsi (lihat
// get-next-question) — label Bloom, indikator kognitif, dan feedback formatif
// TIDAK PERNAH dikirim ke browser untuk opsi yang tidak dipilih. Ini menutup
// celah "opsi->level Bloom bisa diintip lewat DevTools" yang disebutkan
// sebagai batasan di proposal (lihat AUDIT.md §2.2).
//
// Catatan cakupan: endpoint ini hanya menutup celah KERAHASIAAN (opsi tidak
// terlihat sebelum dijawab). Penulisan baris session_answers tetap dilakukan
// klien seperti sebelumnya (RLS memvalidasi kepemilikan sesi) — mengunci
// INTEGRITAS penuh (mencegah klien memalsukan bloom_chosen lewat panggilan
// REST mentah) adalah perbaikan lebih dalam yang belum termasuk di fase ini.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getUserId } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { questionId, optionId } = await req.json()
    if (!questionId || !optionId) throw new Error('questionId dan optionId wajib diisi.')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const userId = await getUserId(req, supabase)
    if (!userId) return json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, 401)

    const { data: question, error: qErr } = await supabase
      .from('questions').select('workspace_id, type, options').eq('id', questionId).maybeSingle()
    if (qErr || !question || question.type !== 'mcq') {
      return json({ error: 'Soal tidak ditemukan.' }, 404)
    }

    const { data: member } = await supabase
      .from('workspace_members').select('user_id')
      .eq('workspace_id', question.workspace_id).eq('user_id', userId).maybeSingle()
    if (!member) return json({ error: 'Kamu bukan anggota kelas ini.' }, 403)

    const option = (question.options ?? []).find((o: Record<string, unknown>) => o.id === optionId)
    if (!option) return json({ error: 'Opsi tidak ditemukan.' }, 400)

    return json({ bloom: option.bloom, feedback: option.feedback ?? '', indicator: option.indicator ?? '' })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
