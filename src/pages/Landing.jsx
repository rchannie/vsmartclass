import { Link } from 'react-router-dom'
import {
  Sparkles, GitBranch, Lightbulb, ArrowRight, LogIn,
  GraduationCap, Users, BarChart3, FolderOpen, KeyRound, Play, UserRound,
} from 'lucide-react'
import { useAuth } from '../stores/auth'
import { BLOOM, BLOOM_LEVELS } from '../lib/bloom'
import Logo from '../components/ui/Logo'

// Tiga pilar utama — sesuai proposal LIDM
const PILLARS = [
  {
    icon: Sparkles,
    title: 'Smart Question Generator',
    desc: 'AI menyusun soal yang setiap opsi jawabannya berlabel level Bloom (C1–C6). Tidak ada jawaban salah — setiap pilihan mencerminkan kedalaman berpikir.',
  },
  {
    icon: GitBranch,
    title: 'Bloom-Based Adaptive Evaluation',
    desc: 'Tingkat soal naik-turun mengikuti performa riil siswa — adaptasi dalam sesi dan antar sesi, layaknya Computerized Adaptive Testing.',
  },
  {
    icon: Lightbulb,
    title: 'Personalized Treatment Recommendation',
    desc: 'Rekomendasi cara belajar untuk siswa sesuai gaya VARK-nya, dan saran strategi mengajar untuk guru berdasarkan peta kognitif kelas.',
  },
]

const GURU_STEPS = [
  { icon: Users, text: 'Buat workspace kelas dan bagikan kode undangan ke siswa' },
  { icon: Sparkles, text: 'Generate soal berlabel Bloom dengan AI, tinjau, lalu publikasikan' },
  { icon: BarChart3, text: 'Pantau heatmap dan trajektori kognitif kelas secara live' },
  { icon: Lightbulb, text: 'Terima saran strategi mengajar berdasarkan profil kelas' },
]

const SISWA_STEPS = [
  { icon: KeyRound, text: 'Gabung kelas dengan kode dari gurumu' },
  { icon: Play, text: 'Kerjakan sesi adaptif — soal menyesuaikan level berpikirmu' },
  { icon: UserRound, text: 'Lihat Profil Bloom dan rekomendasi belajar sesuai gayamu' },
  { icon: FolderOpen, text: 'Buktikan level Mencipta (C6) lewat proyek karyamu' },
]

export default function Landing() {
  const { user, profile } = useAuth()
  const dashboardPath = profile?.role === 'guru' ? '/guru/dashboard' : '/siswa/beranda'

  return (
    <div className="min-h-screen bg-bg">
      {/* Navbar */}
      <header
        className="sticky top-0 z-30 border-b border-line backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--surface) 90%, transparent)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Logo size="sm" textClassName="text-base" />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to={dashboardPath} className="btn-primary">
                Buka Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/masuk" className="btn-ghost">Masuk</Link>
                <Link to="/daftar" className="btn-primary">Daftar Gratis</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-8 md:pt-20">
        <div className="mx-auto max-w-3xl text-center fade-up">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-muted">
            <GraduationCap size={14} className="text-accent" />
            Evaluasi Adaptif × Taksonomi Bloom × AI
          </p>
          <h1 className="text-3xl leading-tight md:text-5xl">
            Setiap jawaban mencerminkan{' '}
            <span className="text-accent">level berpikir</span>, bukan sekadar benar atau salah
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            VSmartClass memetakan perkembangan kognitif siswa (C1–C6) secara real-time,
            menghasilkan soal adaptif dengan AI, dan memberi rekomendasi belajar personal —
            sehingga guru fokus mengajar, bukan tenggelam dalam administrasi.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link to={dashboardPath} className="btn-primary px-6 py-3">
                Lanjut ke Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/daftar" className="btn-primary px-6 py-3">
                  Mulai Sekarang — Gratis <ArrowRight size={16} />
                </Link>
                <Link to="/masuk" className="btn-outline px-6 py-3">
                  <LogIn size={16} /> Masuk
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tangga Bloom */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="flex items-end justify-center gap-1.5 md:gap-2.5">
            {BLOOM_LEVELS.map((code, i) => (
              <div key={code} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="hidden text-[10px] font-bold text-muted md:block">{BLOOM[code].name}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${28 + i * 14}px`, background: BLOOM[code].color }}
                />
                <span className="text-xs font-extrabold" style={{ color: BLOOM[code].color }}>{code}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Tangga kognitif Taksonomi Bloom Revisi — dari Mengingat (C1) hingga Mencipta (C6)
          </p>
        </div>
      </section>

      {/* Tiga pilar */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
          <h2 className="text-center text-xl md:text-2xl">Tiga Pilar VSmartClass</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-5">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-accent"
                  style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))' }}
                >
                  <Icon size={20} />
                </span>
                <h3 className="mt-3 text-base">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <h2 className="text-center text-xl md:text-2xl">Bagaimana Cara Kerjanya?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Untuk Guru</p>
            <ul className="mt-4 space-y-3.5">
              {GURU_STEPS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-accent"
                    style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))' }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-sm leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--c4)' }}>Untuk Siswa</p>
            <ul className="mt-4 space-y-3.5">
              {SISWA_STEPS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill"
                    style={{ background: 'color-mix(in srgb, var(--c4) 12%, var(--surface))', color: 'var(--c4)' }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-sm leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Level Bloom */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
          <h2 className="text-center text-xl md:text-2xl">Enam Level Berpikir</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
            Setiap interaksi belajar diberi label level kognitif — fondasi seluruh sistem VSmartClass.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BLOOM_LEVELS.map((code) => (
              <div key={code} className="card flex items-start gap-3 p-4">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-extrabold text-white"
                  style={{ background: BLOOM[code].color }}
                >
                  {code}
                </span>
                <div>
                  <p className="text-sm font-extrabold">{BLOOM[code].name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{BLOOM[code].desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA akhir */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center md:px-8">
        <h2 className="text-xl md:text-2xl">Siap menciptakan kelas yang lebih adaptif?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Gratis untuk guru dan siswa. Cukup daftar, buat atau gabung kelas, dan mulai sesi pertamamu.
        </p>
        {!user && (
          <Link to="/daftar" className="btn-primary mt-6 px-6 py-3">
            Buat Akun Sekarang <ArrowRight size={16} />
          </Link>
        )}
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 md:flex-row md:px-8">
          <Logo size="sm" textClassName="text-sm" />
          <p className="text-xs text-muted">
            VSmartClass — Lomba Inovasi Digital Mahasiswa · Universitas Pendidikan Indonesia
          </p>
        </div>
      </footer>
    </div>
  )
}
