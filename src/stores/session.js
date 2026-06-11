// State machine sesi soal adaptif (Modul 3).
// Alur MCQ : idle → question → feedback → generating → question … → done
// Alur Esai: idle → question → evaluating → feedback → generating → question … → done
//
// Aturan adaptasi (consecutive-success):
//   chosen >= target, streak < 2  →  next = target       [tetap, bangun streak]
//   chosen >= target, streak ≥ 2  →  next = target + 1   [naik, streak reset]
//   chosen <  target              →  next = chosen, streak = 0  [turun/reset + scaffolding]
//
// Diagnostic session (sesi pertama per topik):
//   isDiagnostic = true  →  start dari C3 (tengah skala) agar kalibrasi lebih cepat
//   isDiagnostic = false →  start dari startLevel (level profil terakhir siswa)
//
// Pre-generation strategy:
//   choose() langsung pre-fetch soal N+1 di background saat siswa baca feedback soal N
//   → next() menggunakan prefetchedQ bila sudah siap (ADAPT_DELAY diperpendek ke 600ms)

import { create } from 'zustand'
import * as api from '../lib/api'
import { codeOf, levelOf } from '../lib/bloom'

export const SESSION_LENGTH = 6
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
  phase:        'idle',      // 'idle' | 'question' | 'feedback' | 'evaluating' | 'generating' | 'done'
  picked:       null,        // opsi MCQ yang dipilih
  essayResult:  null,        // { bloom_level_achieved, feedback, followUpPrompt } dari evaluate-essay
  target:       'C2',
  streak:       0,           // jawaban berturut-turut di/atas target (perlu 2 untuk naik)
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

  choose: (option) => {
    if (get().phase !== 'question') return
    const s = get()
    set({ picked: option, phase: 'feedback' })

    // Pre-fetch soal N+1 di background segera setelah siswa menjawab,
    // sehingga soal sudah siap saat tombol "Soal berikutnya" diklik.
    if (s.answers.length + 1 < SESSION_LENGTH) {
      const chosenLvl   = levelOf(option.bloom)
      const targetLvl   = levelOf(s.target)
      const hit         = chosenLvl >= targetLvl
      const newStreak   = hit ? s.streak + 1 : 0
      const prefetchLvl = newStreak >= 2 ? Math.min(6, targetLvl + 1) : hit ? targetLvl : chosenLvl
      const prefetchTarget = codeOf(prefetchLvl)

      api.nextQuestion({
        workspaceId: s.workspaceId,
        topic:       s.topic,
        subject:     s.subject,
        target:      prefetchTarget,
        excludeIds:  s.items.map((i) => i.id),
      })
        .then((q) => set({ prefetchedQ: q }))
        .catch(() => { /* fallback: next() akan fetch ulang */ })
    }
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

    // Pre-fetch soal berikutnya di background (sama seperti MCQ)
    if (s.answers.length + 1 < SESSION_LENGTH) {
      const chosenLvl   = levelOf(result.bloom_level_achieved)
      const targetLvl   = levelOf(s.target)
      const hit         = chosenLvl >= targetLvl
      const newStreak   = hit ? s.streak + 1 : 0
      const prefetchLvl = newStreak >= 2 ? Math.min(6, targetLvl + 1) : hit ? targetLvl : chosenLvl
      api.nextQuestion({
        workspaceId: s.workspaceId, topic: s.topic, subject: s.subject,
        target: codeOf(prefetchLvl), excludeIds: s.items.map((i) => i.id),
      }).then((q) => set({ prefetchedQ: q })).catch(() => {})
    }
  },

  next: async () => {
    const s = get()
    if (s.phase !== 'feedback') return

    // Ambil bloom level dari MCQ (picked.bloom) atau Esai (essayResult)
    const bloomChosen = s.essayResult ? s.essayResult.bloom_level_achieved : s.picked?.bloom
    if (!bloomChosen) return

    const question    = s.items[s.currentIdx]
    const chosenLvl   = levelOf(bloomChosen)
    const targetLvl   = levelOf(s.target)
    const hit         = chosenLvl >= targetLvl
    const newStreak   = hit ? s.streak + 1 : 0
    const nextLvl     = newStreak >= 2 ? Math.min(6, targetLvl + 1) : hit ? targetLvl : chosenLvl
    const nextTarget  = codeOf(nextLvl)

    const answer = {
      question_id:   question.id,
      chosen_option: s.essayResult ? 'essay' : (s.picked?.id ?? ''),
      bloom_chosen:  bloomChosen,
      bloom_target:  s.target,
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
      phase:       'generating',
      target:      nextTarget,
      streak:      newStreak >= 2 ? 0 : newStreak,
      prefetchedQ: null,
      essayResult: null,
      adaptation: {
        from:      codeOf(targetLvl),
        to:        nextTarget,
        direction: Math.sign(nextLvl - targetLvl),
      },
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
