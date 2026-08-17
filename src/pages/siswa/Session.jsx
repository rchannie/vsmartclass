import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Flag, HeartHandshake, ArrowUpRight, ArrowDownRight, MoveRight, Target, Lightbulb, Send } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useMyBloomProfiles } from '../../hooks/useBloomProfile'
import { useSession, SESSION_LENGTH } from '../../stores/session'
import { BLOOM, BLOOM_LEVELS, codeOf, levelOf, softBg, SCAFFOLD_TIPS } from '../../lib/bloom'
import BloomBadge from '../../components/bloom/BloomBadge'
import ProgressDots from '../../components/ui/ProgressDots'
import AIThinking from '../../components/ui/AIThinking'

export default function StudentSession() {
  const { topic: rawTopic } = useParams()
  const topic = decodeURIComponent(rawTopic)
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const { data: myProfiles = [] } = useMyBloomProfiles(user?.id, active?.id)
  const navigate = useNavigate()
  const s = useSession()

  // Deteksi apakah ini sesi pertama untuk topik ini
  const existingProfile = myProfiles.find((p) => p.topic === topic && p.session_count > 0)
  const isDiagnostic    = !existingProfile
  const startLevel      = existingProfile ? codeOf(existingProfile.current_level || 1) : 'C2'
  const introTarget     = isDiagnostic ? 'C3' : startLevel

  // keluar halaman = sesi baru berikutnya mulai bersih
  useEffect(() => () => useSession.getState().reset(), [])

  if (!active) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Kamu belum tergabung di kelas mana pun.</p>
        <Link to="/siswa/beranda" className="btn-outline text-xs"><ArrowLeft size={14} /> Beranda</Link>
      </div>
    )
  }

  const start = () =>
    s.startSession({ workspaceId: active.id, userId: user.id, topic, subject: active.subject, isDiagnostic, startLevel })

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/siswa/beranda')} className="btn-ghost !px-2 text-xs">
          <ArrowLeft size={14} /> Keluar sesi
        </button>
        {(s.phase === 'question' || s.phase === 'revealing' || s.phase === 'justifying' || s.phase === 'evaluating' || s.phase === 'feedback') && (
          <ProgressDots total={SESSION_LENGTH} current={s.currentIdx} />
        )}
      </header>

      {/* ——— INTRO ——— */}
      {s.phase === 'idle' && (
        <div className="card fade-up p-7 text-center">
          {isDiagnostic ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold text-white"
              style={{ background: BLOOM['C3'].color }}
            >
              <Target size={13} /> Kalibrasi Awal
            </span>
          ) : (
            <BloomBadge code={startLevel} size="lg" soft className="!text-sm" />
          )}
          <h1 className="mt-3 text-xl">{topic}</h1>
          <p className="mt-2 text-sm text-muted">
            {isDiagnostic
              ? `Sesi pertamamu di topik ini — ${SESSION_LENGTH} soal untuk memetakan posisi berpikirmu. Mulai dari C3 agar kalibrasi lebih cepat.`
              : `${SESSION_LENGTH} soal adaptif · melanjutkan dari ${startLevel} · soal menyesuaikan caramu menjawab.`}
          </p>
          <div
            className="mx-auto mt-4 flex max-w-md items-start gap-2.5 rounded-md p-3.5 text-left text-xs leading-relaxed"
            style={{ background: softBg(introTarget, 10) }}
          >
            <HeartHandshake size={16} className="mt-0.5 shrink-0" style={{ color: BLOOM[introTarget].color }} />
            <span>
              <span className="font-extrabold">Tidak ada jawaban salah.</span> Setiap opsi mewakili cara
              berpikir yang berbeda — pilih yang paling dekat dengan caramu, dan sistem akan memahami levelmu.
            </span>
          </div>
          <button type="button" onClick={start} className="btn-primary mt-5 px-8">
            <Play size={16} /> {isDiagnostic ? 'Mulai kalibrasi' : 'Lanjutkan sesi'}
          </button>
        </div>
      )}

      {/* ——— GENERATING / ADAPTASI ——— */}
      {s.phase === 'generating' && (
        <>
          {s.adaptation && <AdaptInfo adaptation={s.adaptation} />}
          <AIThinking
            label={s.isDiagnostic && s.currentIdx === 0 ? 'Menyiapkan soal kalibrasi…' : 'Menyesuaikan soal…'}
            sub={`Target: ${s.target} · ${BLOOM[s.target].name}`}
          />
        </>
      )}

      {/* ——— SOAL & FEEDBACK ——— */}
      {(s.phase === 'question' || s.phase === 'revealing' || s.phase === 'justifying' || s.phase === 'evaluating' || s.phase === 'feedback') && <QuestionView s={s} />}

      {/* ——— RINGKASAN ——— */}
      {s.phase === 'done' && <Summary s={s} topic={topic} isDiagnostic={s.isDiagnostic} />}
    </div>
  )
}

function AdaptInfo({ adaptation }) {
  const { from, to, direction } = adaptation
  const Icon = direction > 0 ? ArrowUpRight : direction < 0 ? ArrowDownRight : MoveRight
  const text =
    direction > 0
      ? `Jawabanmu menunjukkan kamu siap naik — target ${from} → ${to}.`
      : direction < 0
        ? `Kita mantapkan dulu di ${to} sebelum melangkah lebih tinggi.`
        : `Target bertahan di ${to} — mari kuatkan level ini.`
  const scaffold = direction < 0 ? SCAFFOLD_TIPS[to] : null
  return (
    <div className="space-y-1.5">
      <div
        className="fade-up flex items-center gap-2.5 rounded-md p-3.5 text-xs font-bold"
        style={{ background: softBg(to, 12), color: BLOOM[to].color }}
      >
        <Icon size={16} />
        {text}
      </div>
      {scaffold && (
        <div className="fade-up flex items-start gap-2 rounded-md border border-line bg-surface px-3.5 py-2.5 text-xs text-muted">
          <Lightbulb size={13} className="mt-0.5 shrink-0 text-[color:var(--c4)]" />
          <span><span className="font-bold text-ink">Tips: </span>{scaffold}</span>
        </div>
      )}
    </div>
  )
}

function QuestionView({ s }) {
  const q = s.items[s.currentIdx]
  if (!q) return null
  const isFeedback   = s.phase === 'feedback'
  const isRevealing  = s.phase === 'revealing'
  const isJustifying = s.phase === 'justifying'
  const isEvaluating = s.phase === 'evaluating'
  const isLast      = s.answers.length === SESSION_LENGTH - 1
  const isEssay     = q.type === 'essay'
  const isC6        = s.target === 'C6'

  return (
    <div className="space-y-4">
      {/* Banner Tantangan Mencipta (C6) */}
      {isC6 && (
        <div
          className="fade-up flex items-center gap-2.5 rounded-md px-4 py-3 text-xs font-bold text-white"
          style={{ background: BLOOM.C6.color }}
        >
          <Target size={14} />
          Tantangan Mencipta — kamu sudah di puncak Bloom! Soal ini mengundangmu untuk menciptakan sesuatu yang orisinal.
        </div>
      )}

      <div className="card fade-up overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="text-xs font-bold text-muted">Soal {s.currentIdx + 1} dari {SESSION_LENGTH}</span>
          {isEssay && <span className="text-xs font-bold text-muted">Esai</span>}
        </header>
        <div className="p-5">
          <p className="text-base font-extrabold leading-relaxed">{q.prompt}</p>

          {isEssay ? (
            /* ——— Essay input ——— */
            <EssayInput s={s} isLast={isLast} isEvaluating={isEvaluating} isFeedback={isFeedback} />
          ) : (
            /* ——— MCQ options ——— */
            <>
              <div className="mt-4 space-y-2.5">
                {(q.options || []).map((opt) => {
                  const picked = s.picked?.id === opt.id
                  const locked = isFeedback || isRevealing || isJustifying || isEvaluating
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={locked}
                      onClick={() => s.choose(opt)}
                      className="w-full rounded-md border-2 p-3.5 text-left transition-all disabled:cursor-default"
                      style={{
                        borderColor: picked ? 'var(--accent)' : 'var(--border)',
                        background: picked ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)',
                        opacity: locked && !picked ? 0.45 : 1,
                      }}
                    >
                      <span className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-muted">{opt.id}.</span>
                        <span className="flex-1 text-sm font-bold leading-snug">{opt.text}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-4 text-center text-[11px] text-muted">
                Tidak ada jawaban salah — pilih yang paling menggambarkan caramu berpikir.
              </p>
              {s.phase === 'question' && (
                <button
                  type="button"
                  disabled={!s.picked}
                  onClick={s.confirmChoice}
                  className="btn-primary mt-4 w-full disabled:opacity-40"
                >
                  <Send size={15} /> Kirim jawaban
                </button>
              )}
              {isRevealing && (
                <p className="mt-4 text-center text-xs text-muted">Memeriksa jawabanmu…</p>
              )}
              {/* RF-11: opsi bernalar C4+ mewajibkan alasan singkat sebelum feedback muncul */}
              {(isJustifying || isEvaluating) && (
                <JustificationBlock s={s} isEvaluating={isEvaluating} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Feedback MCQ — modal setelah jawaban dikirim */}
      {isFeedback && s.picked && !isEssay && (
        <FeedbackModal>
          <div className="flex items-center gap-2">
            <BloomBadge code={s.picked.bloom} size="md" />
            <p className="text-sm font-extrabold">{BLOOM[s.picked.bloom].name}</p>
          </div>
          {s.picked.indicator && <p className="mt-2 text-xs text-muted">{s.picked.indicator}</p>}
          <p className="mt-2 text-sm leading-relaxed">{s.picked.feedback}</p>
          {s.justificationResult && (
            <div
              className={`mt-3 rounded-md border px-3 py-2.5 text-xs leading-relaxed ${
                s.justificationResult.verified
                  ? 'border-[color:var(--c3)]/30 bg-[color:var(--c3)]/5'
                  : 'border-[color:var(--c6)]/30 bg-[color:var(--c6)]/5'
              }`}
            >
              <p className="font-bold">
                {s.justificationResult.verified
                  ? 'Alasanmu menunjukkan penalaran ini dengan jelas.'
                  : `Dicatat sebagai ${codeOf(levelOf(s.picked.bloom) - 1)} — alasanmu belum sepenuhnya menunjukkan penalaran ${s.picked.bloom}.`}
              </p>
              {s.justificationResult.feedback && <p className="mt-1">{s.justificationResult.feedback}</p>}
            </div>
          )}
          <button type="button" onClick={s.next} className="btn-primary mt-5 w-full">
            {isLast ? 'Selesaikan sesi' : 'Soal berikutnya'} <ArrowRight size={15} />
          </button>
        </FeedbackModal>
      )}
    </div>
  )
}

// RF-11: alasan singkat wajib untuk opsi bernalar C4+ — dievaluasi AI sebelum feedback muncul.
function JustificationBlock({ s, isEvaluating }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-4 space-y-3 rounded-md border border-dashed border-line p-3.5">
      <p className="flex items-start gap-2 text-xs leading-relaxed">
        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[color:var(--c4)]" />
        <span>
          Opsi ini menunjukkan penalaran <span className="font-bold">{s.picked.bloom}</span> — tuliskan alasan
          singkat kenapa kamu memilihnya, supaya levelmu benar-benar terkonfirmasi.
        </span>
      </p>
      <textarea
        className="input min-h-[90px] text-sm"
        placeholder="Jelaskan alasanmu memilih opsi ini…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isEvaluating}
        aria-label="Alasan memilih opsi ini"
      />
      {isEvaluating ? (
        <p className="text-center text-xs text-muted">AI sedang menilai alasanmu…</p>
      ) : (
        <button
          type="button"
          disabled={text.trim().length < 10}
          onClick={() => s.submitJustification(text)}
          className="btn-primary w-full disabled:opacity-40"
        >
          Kirim alasan <ArrowRight size={15} />
        </button>
      )}
    </div>
  )
}

function FeedbackModal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="fade-up max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-6 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function EssayInput({ s, isLast, isEvaluating, isFeedback }) {
  const [text, setText] = useState('')
  const result = s.essayResult  // { bloom_level_achieved, feedback, followUpPrompt }

  if (isFeedback && result) {
    const code = result.bloom_level_achieved
    return (
      <FeedbackModal>
        <div className="flex items-center gap-2">
          <BloomBadge code={code} size="md" />
          <p className="text-sm font-extrabold">{BLOOM[code].name} — level yang kamu tunjukkan</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{result.feedback}</p>
        {result.followUpPrompt && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-line bg-bg px-3 py-2.5 text-xs">
            <Lightbulb size={13} className="mt-0.5 shrink-0 text-[color:var(--c4)]" />
            <span><span className="font-bold">Pertanyaan lanjutan: </span>{result.followUpPrompt}</span>
          </div>
        )}
        <button type="button" onClick={s.next} className="btn-primary mt-5 w-full">
          {isLast ? 'Selesaikan sesi' : 'Soal berikutnya'} <ArrowRight size={15} />
        </button>
      </FeedbackModal>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        className="input min-h-[120px] text-sm"
        placeholder="Tuliskan jawabanmu di sini — tidak ada batasan panjang, ekspresikan pikiranmu…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isEvaluating}
      />
      {isEvaluating ? (
        <p className="text-center text-xs text-muted">AI sedang menilai jawabanmu…</p>
      ) : (
        <button
          type="button"
          disabled={text.trim().length < 10}
          onClick={() => s.submitEssay(text)}
          className="btn-primary"
        >
          Kirim jawaban <ArrowRight size={15} />
        </button>
      )}
    </div>
  )
}

function Summary({ s, topic, isDiagnostic }) {
  // snapshot distribusi level yang dipilih selama sesi
  const counts = BLOOM_LEVELS.map(
    (code) => s.answers.filter((a) => a.bloom_chosen === code).length,
  )
  const max = Math.max(1, ...counts)
  const finalCode = codeOf(s.finalLevel || 1)

  return (
    <div className="card fade-up p-7">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-extrabold text-white" style={{ background: BLOOM[finalCode].color }}>
          {isDiagnostic ? <Target size={15} /> : <Flag size={15} />}
          {isDiagnostic ? `Kalibrasi selesai: ${finalCode} · ${BLOOM[finalCode].name}` : `Level sesi ini: ${finalCode} · ${BLOOM[finalCode].name}`}
        </span>
        <h2 className="mt-3 text-xl">{isDiagnostic ? 'Kalibrasi awal selesai!' : 'Sesi selesai — kerja bagus!'}</h2>
        <p className="mt-1 text-sm text-muted">{topic} · {s.answers.length} soal</p>
      </div>

      {/* bar chart snapshot bloom sesi */}
      <div className="mx-auto mt-6 flex h-36 max-w-sm items-end justify-center gap-3">
        {BLOOM_LEVELS.map((code, i) => (
          <div key={code} className="flex h-full w-10 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold text-muted">{counts[i] || ''}</span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${(counts[i] / max) * 100}%`,
                minHeight: counts[i] ? 8 : 2,
                background: counts[i] ? BLOOM[code].color : 'var(--border)',
              }}
            />
            <span className="font-mono text-[10px] font-bold" style={{ color: BLOOM[code].color }}>{code}</span>
          </div>
        ))}
      </div>

      {s.result && (
        <p className="mt-5 text-center text-xs text-muted">
          Profil Bloom-mu telah diperbarui — level saat ini{' '}
          <span className="font-mono font-extrabold" style={{ color: BLOOM[codeOf(s.result.current_level)].color }}>
            {codeOf(s.result.current_level)}
          </span>{' '}
          dari {s.result.session_count} sesi.
        </p>
      )}

      <div className="mt-6 flex justify-center gap-2.5">
        <Link to="/siswa/profil" className="btn-primary">Lihat Profil Bloom <ArrowRight size={15} /></Link>
        <Link to="/siswa/beranda" className="btn-outline">Kembali ke Beranda</Link>
      </div>
    </div>
  )
}
