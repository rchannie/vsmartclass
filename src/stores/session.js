// State machine sesi soal adaptif (Modul 3).
// Alur: idle → question → feedback → generating → question … → done
// Aturan adaptasi:
//   chosen >= target  →  next = chosen + 1 (maks C6)   [naik]
//   chosen <  target  →  next = chosen                 [tetap/turun]

import { create } from 'zustand'
import * as api from '../lib/api'
import { codeOf, levelOf } from '../lib/bloom'

export const SESSION_LENGTH = 6
const ADAPT_DELAY = 1500 // "AI menyesuaikan soal…" (spek: 1.5 dtk)

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const initial = {
  sessionId: null,
  workspaceId: null,
  userId: null,
  topic: null,
  subject: null,
  items: [],          // soal yang sudah tampil
  currentIdx: 0,
  phase: 'idle',      // 'idle' | 'question' | 'feedback' | 'generating' | 'done'
  picked: null,       // opsi yang dipilih pada soal aktif
  target: 'C2',       // target Bloom soal aktif (mulai dari C2 sesuai spek)
  answers: [],
  adaptation: null,   // { from, to, direction } — info utk layar "AI menyesuaikan"
  result: null,       // profil bloom terbaru setelah selesai
  finalLevel: null,
}

export const useSession = create((set, get) => ({
  ...initial,

  startSession: async ({ workspaceId, userId, topic, subject }) => {
    set({ ...initial, workspaceId, userId, topic, subject, phase: 'generating' })
    const [sessionId, firstQ] = await Promise.all([
      api.createSession({ workspaceId, userId, topic, subject }),
      api.nextQuestion({ workspaceId, topic, subject, target: 'C2', excludeIds: [] }),
      delay(900), // biar shimmer sempat terlihat
    ])
    set({ sessionId, items: [firstQ], currentIdx: 0, phase: 'question', target: 'C2' })
  },

  choose: (option) => {
    if (get().phase !== 'question') return
    set({ picked: option, phase: 'feedback' })
  },

  next: async () => {
    const s = get()
    if (s.phase !== 'feedback' || !s.picked) return

    const question = s.items[s.currentIdx]
    const chosenLvl = levelOf(s.picked.bloom)
    const targetLvl = levelOf(s.target)
    const nextLvl = chosenLvl >= targetLvl ? Math.min(6, chosenLvl + 1) : chosenLvl
    const nextTarget = codeOf(nextLvl)

    const answer = {
      question_id: question.id,
      chosen_option: s.picked.id,
      bloom_chosen: s.picked.bloom,
      bloom_target: s.target,
    }
    const answers = [...s.answers, answer]
    api.recordAnswer(s.sessionId, answer) // fire-and-forget

    // Sesi selesai?
    if (answers.length >= SESSION_LENGTH) {
      const finalLevel = Math.max(1, ...answers.map((a) => levelOf(a.bloom_chosen)))
      set({ answers, phase: 'done', finalLevel })
      const result = await api.completeSession({
        sessionId: s.sessionId, workspaceId: s.workspaceId,
        userId: s.userId, topic: s.topic, answers,
      })
      set({ result })
      return
    }

    // Adaptasi → soal berikutnya
    set({
      answers,
      phase: 'generating',
      target: nextTarget,
      adaptation: {
        from: codeOf(targetLvl),
        to: nextTarget,
        direction: Math.sign(nextLvl - targetLvl), // 1 naik, 0 tetap, -1 turun
      },
    })
    const [q] = await Promise.all([
      api.nextQuestion({
        workspaceId: s.workspaceId, topic: s.topic, subject: s.subject,
        target: nextTarget, excludeIds: s.items.map((i) => i.id),
      }),
      delay(ADAPT_DELAY),
    ])
    set((st) => ({
      items: [...st.items, q],
      currentIdx: st.currentIdx + 1,
      phase: 'question',
      picked: null,
    }))
  },

  reset: () => set({ ...initial }),
}))
