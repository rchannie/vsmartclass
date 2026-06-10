import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Flag, HeartHandshake, ArrowUpRight, ArrowDownRight, MoveRight } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { useActiveWorkspace } from '../../hooks/useActiveWorkspace'
import { useSession, SESSION_LENGTH } from '../../stores/session'
import { BLOOM, BLOOM_LEVELS, codeOf, softBg } from '../../lib/bloom'
import BloomBadge from '../../components/bloom/BloomBadge'
import ProgressDots from '../../components/ui/ProgressDots'
import AIThinking from '../../components/ui/AIThinking'

export default function StudentSession() {
  const { topic: rawTopic } = useParams()
  const topic = decodeURIComponent(rawTopic)
  const { user } = useAuth()
  const { active } = useActiveWorkspace(user?.id)
  const navigate = useNavigate()
  const s = useSession()

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
    s.startSession({ workspaceId: active.id, userId: user.id, topic, subject: active.subject })

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/siswa/beranda')} className="btn-ghost !px-2 text-xs">
          <ArrowLeft size={14} /> Keluar sesi
        </button>
        {(s.phase === 'question' || s.phase === 'feedback') && (
          <ProgressDots total={SESSION_LENGTH} current={s.currentIdx} />
        )}
      </header>

      {/* ——— INTRO ——— */}
      {s.phase === 'idle' && (
        <div className="card fade-up p-7 text-center">
          <BloomBadge code="C2" size="lg" soft className="!text-sm" />
          <h1 className="mt-3 text-xl">{topic}</h1>
          <p className="mt-2 text-sm text-muted">
            {SESSION_LENGTH} soal adaptif · mulai dari target C2 · soal menyesuaikan caramu menjawab.
          </p>
          <div
            className="mx-auto mt-4 flex max-w-md items-start gap-2.5 rounded-md p-3.5 text-left text-xs leading-relaxed"
            style={{ background: softBg('C2', 10) }}
          >
            <HeartHandshake size={16} className="mt-0.5 shrink-0 text-c2" />
            <span>
              <span className="font-extrabold">Tidak ada jawaban salah.</span> Setiap opsi mewakili cara
              berpikir yang berbeda — pilih yang paling dekat dengan caramu, dan sistem akan memahami levelmu.
            </span>
          </div>
          <button type="button" onClick={start} className="btn-primary mt-5 px-8">
            <Play size={16} /> Mulai sesi
          </button>
        </div>
      )}

      {/* ——— GENERATING / ADAPTASI ——— */}
      {s.phase === 'generating' && (
        <>
          {s.adaptation && <AdaptInfo adaptation={s.adaptation} />}
          <AIThinking
            label="AI menyesuaikan soal…"
            sub={`Target berikutnya: ${s.target} · ${BLOOM[s.target].name}`}
          />
        </>
      )}

      {/* ——— SOAL & FEEDBACK ——— */}
      {(s.phase === 'question' || s.phase === 'feedback') && <QuestionView s={s} />}

      {/* ——— RINGKASAN ——— */}
      {s.phase === 'done' && <Summary s={s} topic={topic} />}
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
  return (
    <div
      className="fade-up flex items-center gap-2.5 rounded-md p-3.5 text-xs font-bold"
      style={{ background: softBg(to, 12), color: BLOOM[to].color }}
    >
      <Icon size={16} />
      {text}
    </div>
  )
}

function QuestionView({ s }) {
  const q = s.items[s.currentIdx]
  if (!q) return null
  const isFeedback = s.phase === 'feedback'
  const isLast = s.answers.length === SESSION_LENGTH - 1

  return (
    <div className="space-y-4">
      <div className="card fade-up overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="text-xs font-bold text-muted">Soal {s.currentIdx + 1} dari {SESSION_LENGTH}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold">
            <span className="text-muted">Target</span>
            <BloomBadge code={s.target} size="md" />
          </span>
        </header>
        <div className="p-5">
          <p className="text-base font-extrabold leading-relaxed">{q.prompt}</p>

          <div className="mt-4 space-y-2.5">
            {(q.options || []).map((opt) => {
              const picked = s.picked?.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isFeedback}
                  onClick={() => s.choose(opt)}
                  className="w-full rounded-md border-2 p-3.5 text-left transition-all disabled:cursor-default"
                  style={{
                    borderColor: picked ? BLOOM[opt.bloom].color : 'var(--border)',
                    background: picked ? softBg(opt.bloom, 14) : 'var(--surface)',
                    opacity: isFeedback && !picked ? 0.45 : 1,
                  }}
                >
                  <span className="flex items-start gap-3">
                    <span className="font-mono text-xs font-bold text-muted">{opt.id}.</span>
                    <span className="flex-1 text-sm font-bold leading-snug">{opt.text}</span>
                    <BloomBadge code={opt.bloom} size="sm" soft />
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted">
            Tidak ada jawaban salah — pilih yang paling menggambarkan caramu berpikir.
          </p>
        </div>
      </div>

      {/* Feedback instan per opsi (UX rule #3: selalu tampil sebelum lanjut) */}
      {isFeedback && s.picked && (
        <div
          className="card fade-up p-5"
          style={{ background: softBg(s.picked.bloom, 10), borderColor: BLOOM[s.picked.bloom].color }}
        >
          <div className="flex items-center gap-2">
            <BloomBadge code={s.picked.bloom} size="md" />
            <p className="text-sm font-extrabold">{BLOOM[s.picked.bloom].name}</p>
          </div>
          {s.picked.indicator && <p className="mt-2 text-xs text-muted">{s.picked.indicator}</p>}
          <p className="mt-2 text-sm leading-relaxed">{s.picked.feedback}</p>
          <button type="button" onClick={s.next} className="btn-primary mt-4">
            {isLast ? 'Selesaikan sesi' : 'Soal berikutnya'} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function Summary({ s, topic }) {
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
          <Flag size={15} /> Level tertinggi: {finalCode} · {BLOOM[finalCode].name}
        </span>
        <h2 className="mt-3 text-xl">Sesi selesai — kerja bagus!</h2>
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
