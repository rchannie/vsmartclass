// State machine sesi soal adaptif (Modul 3).
// Alur MCQ (bloom < C4)    : idle → question → feedback → generating → question … → done
// Alur MCQ (bloom ≥ C4)    : idle → question → justifying → evaluating → feedback → generating … → done
// Alur Esai                : idle → question → evaluating → feedback → generating → question … → done
//
// Aturan adaptasi (consecutive-success):
//   chosen >= target, streak < N  →  next = target       [tetap, bangun streak]
//   chosen >= target, streak ≥ N  →  next = target + 1   [naik, streak reset]  (N = STREAK_TO_LEVEL_UP)
//   chosen <  target              →  next = chosen, streak = 0  [turun/reset + scaffolding]
//
// RF-11 — Justifikasi C4+: opsi PG yang dipilih bernalar C4 ke atas mewajibkan
// siswa menulis alasan singkat, dievaluasi Edge Function `evaluate-justification`.
// Bila alasan dinilai TIDAK menunjukkan penalaran level tsb (verified=false),
// level yang tercatat untuk adaptasi & profil diturunkan satu tingkat — memilih
// opsi yang "kelihatan benar" tanpa bisa menjelaskannya tidak dihitung penuh.
//
// Diagnostic session (sesi pertama per topik):
//   isDiagnostic = true  →  start dari C3 (tengah skala) agar kalibrasi lebih cepat
//   isDiagnostic = false →  start dari startLevel (level profil terakhir siswa)
//
// Pre-generation strategy:
//   confirmChoice()/submitJustification() pre-fetch soal N+1 di background saat
//   siswa membaca feedback soal N → next() menggunakan prefetchedQ bila sudah
//   siap (ADAPT_DELAY diperpendek ke 600ms)

import { create } from 'zustand'
import * as api from '../lib/api'
import { adaptNext, levelOf, codeOf } from '../lib/bloom'
import { ADAPTIVE_CONFIG } from '../lib/config'

export const SESSION_LENGTH = ADAPTIVE_CONFIG.SESSION_LENGTH
const ADAPT_DELAY       = 1500 // delay normal bila soal belum siap
const ADAPT_DELAY_SHORT = 600  // delay bila soal sudah di-prefetch

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const initial = {
  sessionId:    null,
  workspaceId:  null,
  userId:       null,
  topic:        null,
  subject:      null,
  items:        [],
  currentIdx:   0,
  phase:        'idle',      // 'idle' | 'question' | 'justifying' | 'evaluating' | 'feedback' | 'generating' | 'done'
  picked:       null,        // opsi MCQ yang dipilih
  essayResult:  null,        // { bloom_level_achieved, feedback, followUpPrompt } dari evaluate-essay
  justification:       '',   // RF-11: alasan singkat siswa untuk opsi bernalar C4+
  justificationResult: null, // { verified, feedback } dari evaluate-justification
  target:       'C2',
  streak:       0,           // jawaban berturut-turut di/atas target (perlu N untuk naik)
  isDiagnostic: false,       // true = sesi pertama topik ini → start C3, label "Kalibrasi Awal"
  prefetchedQ:  null,        // soal N+1 yang sudah di-fetch saat siswa baca feedback soal N
  answers:      [],
  adaptation:   null,
  result:       null,
  finalLevel:   null,
}

export const useSession = create((set, get) => ({
  ...initial,

  startSession: async ({ workspaceId, userId, topic, subject, isDiagnostic = false, startLevel = 'C2' }) => {
    const startTarget = isDiagnostic ? 'C3' : startLevel
    set({ ...initial, workspaceId, userId, topic, subject, phase: 'generating', isDiagnostic })
    const [sessionId, firstQ] = await Promise.all([
      api.createSession({ workspaceId, userId, topic, subject }),
      api.nextQuestion({ workspaceId, topic, subject, target: startTarget, excludeIds: [] }),
      delay(900),
    ])
    set({ sessionId, items: [firstQ], currentIdx: 0, phase: 'question', target: startTarget })
  },

  // Memilih/mengganti opsi — belum mengirim jawaban, siswa masih bisa berganti pilihan.
  choose: (option) => {
    if (get().phase !== 'question') return
    set({ picked: option })
  },

  // Mengirim opsi yang dipilih. Opsi bernalar C4+ (RF-11) masuk fase 'justifying'
  // dulu untuk menuliskan alasan; opsi di bawah itu langsung ke fase feedback.
  confirmChoice: () => {
    const s = get()
    if (s.phase !== 'question' || !s.picked) return

    if (levelOf(s.picked.bloom) >= ADAPTIVE_CONFIG.JUSTIFICATION_MIN_BLOOM) {
      set({ phase: 'justifying' })
      return
    }

    set({ phase: 'feedback' })
    get()._prefetchNext(s.picked.bloom)
  },

  // RF-11: kirim alasan singkat untuk opsi bernalar C4+ → evaluate-justification
  // → fase feedback. Bila evaluasi gagal (mis. Edge Function error), alasan
  // tetap dicatat tapi tidak menghukum siswa (verified dianggap true).
  submitJustification: async (text) => {
    const s = get()
    if (s.phase !== 'justifying' || !s.picked) return
    const q = s.items[s.currentIdx]
    set({ phase: 'evaluating', justification: text })
    let result
    try {
      result = await api.evaluateJustification({
        questionPrompt: q.prompt,
        optionText:     s.picked.text,
        bloomClaimed:   s.picked.bloom,
        justification:  text,
        topic:          s.topic,
        subject:        s.subject,
      })
    } catch {
      result = { verified: true, feedback: '' }
    }
    set({ phase: 'feedback', justificationResult: result })
    get()._prefetchNext(s.picked.bloom, result)
  },

  // Kirim jawaban esai → Edge Function evaluate-essay → fase feedback dengan essayResult
  submitEssay: async (text) => {
    const s = get()
    if (s.phase !== 'question') return
    const q = s.items[s.currentIdx]
    set({ phase: 'evaluating' })
    const result = await api.evaluateEssay({
      answer:      text,
      rubric:      q.rubric || [],
      topic:       s.topic,
      subject:     s.subject,
      targetBloom: s.target,
    })
    set({ phase: 'feedback', essayResult: result, picked: { bloom: result.bloom_level_achieved } })
    get()._prefetchNext(result.bloom_level_achieved)
  },

  // Pre-fetch soal N+1 di background sesegera mungkin, sehingga soal sudah siap
  // saat tombol "Soal berikutnya" diklik. Dipakai oleh confirmChoice/submitJustification/submitEssay.
  _prefetchNext: (bloomChosen, justificationResult) => {
    const s = get()
    if (s.answers.length + 1 >= SESSION_LENGTH) return
    const effective = justificationResult?.verified === false
      ? codeOf(levelOf(bloomChosen) - 1)
      : bloomChosen
    const { nextTarget } = adaptNext(effective, s.target, s.streak)
    api.nextQuestion({
      workspaceId: s.workspaceId,
      topic:       s.topic,
      subject:     s.subject,
      target:      nextTarget,
      excludeIds:  s.items.map((i) => i.id),
    })
      .then((q) => set({ prefetchedQ: q }))
      .catch(() => { /* fallback: next() akan fetch ulang */ })
  },

  next: async () => {
    const s = get()
    if (s.phase !== 'feedback') return

    // Level yang DIKLAIM dari MCQ (picked.bloom) atau Esai (essayResult), lalu
    // diturunkan satu tingkat (RF-11) bila justifikasi dinilai tidak benar-benar
    // menunjukkan penalaran level tsb — memilih opsi yang "kelihatan benar" tanpa
    // bisa menjelaskannya tidak dihitung penuh untuk adaptasi maupun profil.
    const claimedBloom = s.essayResult ? s.essayResult.bloom_level_achieved : s.picked?.bloom
    if (!claimedBloom) return
    const justificationFailed = s.justificationResult?.verified === false
    const bloomChosen = justificationFailed ? codeOf(levelOf(claimedBloom) - 1) : claimedBloom

    const question = s.items[s.currentIdx]
    const { nextTarget, streak: nextStreak, direction } = adaptNext(bloomChosen, s.target, s.streak)

    const answer = {
      question_id:            question.id,
      chosen_option:           s.essayResult ? 'essay' : (s.picked?.id ?? ''),
      bloom_chosen:            bloomChosen,
      bloom_target:            s.target,
      justification:           s.justification || null,
      justification_verified:  s.justificationResult ? s.justificationResult.verified : null,
      justification_feedback:  s.justificationResult?.feedback || null,
    }
    const answers = [...s.answers, answer]
    api.recordAnswer(s.sessionId, answer) // fire-and-forget

    // Sesi selesai?
    if (answers.length >= SESSION_LENGTH) {
      // Modus level yang dipilih; seri dipecah ke level lebih tinggi
      const lvlCounts = answers.reduce((acc, a) => {
        const l = levelOf(a.bloom_chosen); acc[l] = (acc[l] || 0) + 1; return acc
      }, {})
      const finalLevel = Math.max(1, Number(
        Object.entries(lvlCounts).sort(([a, ca], [b, cb]) => cb - ca || Number(b) - Number(a))[0][0]
      ))
      set({ answers, phase: 'done', finalLevel })
      const result = await api.completeSession({
        sessionId: s.sessionId, workspaceId: s.workspaceId,
        userId: s.userId, topic: s.topic, answers,
      })
      set({ result })
      return
    }

    // Ambil soal yang sudah di-prefetch (bila ada), lalu reset
    const prefetched = s.prefetchedQ

    set({
      answers,
      phase:                'generating',
      target:                nextTarget,
      streak:                nextStreak,
      prefetchedQ:           null,
      essayResult:           null,
      justification:         '',
      justificationResult:   null,
      adaptation:            { from: s.target, to: nextTarget, direction },
    })

    const [q] = await Promise.all([
      prefetched
        ? Promise.resolve(prefetched)
        : api.nextQuestion({
            workspaceId: s.workspaceId, topic: s.topic, subject: s.subject,
            target: nextTarget, excludeIds: s.items.map((i) => i.id),
          }),
      delay(prefetched ? ADAPT_DELAY_SHORT : ADAPT_DELAY),
    ])

    set((st) => ({
      items:       [...st.items, q],
      currentIdx:  st.currentIdx + 1,
      phase:       'question',
      picked:      null,
      essayResult: null,
    }))
  },

  reset: () => set({ ...initial }),
}))
