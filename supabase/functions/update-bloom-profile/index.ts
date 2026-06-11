// Edge Function: update-bloom-profile
// Input : { sessionId } — dipanggil saat sesi selesai
// Aksi  : baca session_answers sesi itu, hitung mastery per level (blend 60/40
//         dengan profil lama), tentukan current_level & trend, upsert bloom_profiles.
// Output: { profile }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const levelOf = (code: string | null) => Number(String(code ?? '').replace(/\D/g, '')) || 1

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { sessionId, live = false } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: session, error: sErr } = await supabase
      .from('sessions').select('*').eq('id', sessionId).single()
    if (sErr || !session) throw new Error('Sesi tidak ditemukan')

    const { data: answers = [] } = await supabase
      .from('session_answers').select('*').eq('session_id', sessionId)

    const { data: old } = await supabase
      .from('bloom_profiles').select('*')
      .eq('user_id', session.user_id)
      .eq('workspace_id', session.workspace_id)
      .eq('topic', session.topic)
      .maybeSingle()

    const n = answers!.length || 1
    const next: Record<string, unknown> = {
      user_id: session.user_id,
      workspace_id: session.workspace_id,
      topic: session.topic,
    }
    for (let lvl = 1; lvl <= 6; lvl++) {
      const evidence = answers!.filter((a) => levelOf(a.bloom_chosen) >= lvl).length / n
      const key = `c${lvl}`
      const prev = (old?.[key] as number) ?? 0
      next[key] = Math.round(prev * 0.6 + evidence * 100 * 0.4)
    }
    let level = 1
    for (let lvl = 1; lvl <= 6; lvl++) {
      if ((next[`c${lvl}`] as number) >= 60) level = lvl
    }
    next.current_level = level
    next.updated_at = new Date().toISOString()
    if (!live) {
      // Final update: increment session counter and compute trend
      next.trend = Math.sign(level - ((old?.current_level as number) ?? 1))
      next.session_count = ((old?.session_count as number) ?? 0) + 1
    } else {
      // Live per-answer update: preserve existing session_count and trend
      next.trend = old?.trend ?? 0
      next.session_count = old?.session_count ?? 0
    }

    const { data: profile, error: upErr } = await supabase
      .from('bloom_profiles')
      .upsert(next, { onConflict: 'user_id,workspace_id,topic' })
      .select().single()
    if (upErr) throw upErr

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
