import { useState } from 'react'
import {
  GraduationCap, Users, Sparkles, BarChart3, Lightbulb,
  KeyRound, Play, UserRound, FolderOpen, X, ArrowRight, ArrowLeft,
} from 'lucide-react'
import { onboardKey } from '../../lib/onboard'
import ProgressDots from '../ui/ProgressDots'

// Wizard pengenalan untuk pengguna baru — tampil sekali per akun (per peran),
// bisa dibuka ulang lewat tombol bantuan di AppLayout.
const STEPS = {
  guru: [
    {
      icon: GraduationCap,
      title: 'Selamat datang di VSmartClass!',
      desc: 'Platform evaluasi adaptif berbasis Taksonomi Bloom. Tur singkat ini menunjukkan 4 langkah utama untuk memulai kelasmu.',
    },
    {
      icon: Users,
      title: 'Buat workspace kelasmu',
      desc: 'Dari Dashboard, buat workspace dan dapatkan kode undangan (mis. VSC-7QK2). Bagikan kode itu ke siswa agar mereka bisa bergabung.',
    },
    {
      icon: Sparkles,
      title: 'Buat soal dengan AI',
      desc: 'Di menu Buat Soal, tentukan topik dan target Bloom — AI menyusun soal yang setiap opsinya berlabel C1–C6. Tinjau dulu, lalu publikasikan ke kelas.',
    },
    {
      icon: BarChart3,
      title: 'Pantau peta kognitif live',
      desc: 'Heatmap, trajektori, dan radar Bloom tiap siswa diperbarui real-time saat mereka mengerjakan sesi — tanpa perlu refresh.',
    },
    {
      icon: Lightbulb,
      title: 'Terima saran strategi mengajar',
      desc: 'Halaman Rekomendasi membaca profil Bloom seluruh kelas dan menyarankan strategi yang pas — dari Direct Instruction hingga Project Exhibition.',
    },
  ],
  siswa: [
    {
      icon: GraduationCap,
      title: 'Selamat datang di VSmartClass!',
      desc: 'Di sini tidak ada jawaban yang salah — setiap pilihanmu mencerminkan level berpikirmu (C1–C6). Yuk kenali alurnya sebentar.',
    },
    {
      icon: KeyRound,
      title: 'Gabung kelasmu',
      desc: 'Masukkan kode kelas dari gurumu (mis. VSC-7QK2) di Beranda. Kamu bisa bergabung ke lebih dari satu kelas.',
    },
    {
      icon: Play,
      title: 'Kerjakan sesi adaptif',
      desc: 'Satu sesi berisi 6 soal. Sesi pertama dimulai dari level tengah (C3) untuk kalibrasi — setelah itu soal naik-turun mengikuti jawabanmu.',
    },
    {
      icon: UserRound,
      title: 'Lihat Profil Bloom-mu',
      desc: 'Radar C1–C6 menunjukkan kekuatan berpikirmu per topik, lengkap dengan 3 rekomendasi belajar yang disesuaikan gaya belajarmu (VARK).',
    },
    {
      icon: FolderOpen,
      title: 'Buktikan level Mencipta (C6)',
      desc: 'Level tertinggi tidak diukur lewat soal, tapi lewat karya. Kumpulkan laporan proyekmu di menu Proyek agar ditinjau guru.',
    },
  ],
}

// Komponen di-mount hanya saat terbuka (lihat AppLayout) — idx selalu mulai dari 0.
export default function OnboardingWizard({ role, userId, onClose }) {
  const steps = STEPS[role] || STEPS.siswa
  const [idx, setIdx] = useState(0)

  const finish = () => {
    if (userId) localStorage.setItem(onboardKey(userId), 'done')
    onClose()
  }

  const { icon: Icon, title, desc } = steps[idx]
  const isLast = idx === steps.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan penggunaan"
    >
      <div className="card w-full max-w-md p-6 fade-up">
        <div className="flex items-start justify-between">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-md text-accent"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))' }}
          >
            <Icon size={24} />
          </span>
          <button
            type="button"
            onClick={finish}
            className="rounded-pill p-1.5 text-muted hover:bg-bg hover:text-ink"
            title="Tutup panduan"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="mt-4 text-lg">{title}</h2>
        <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-muted">{desc}</p>

        <div className="mt-5 flex items-center justify-between">
          <ProgressDots total={steps.length} current={idx} />
          <span className="text-xs font-bold text-muted">{idx + 1}/{steps.length}</span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {idx > 0 ? (
            <button type="button" onClick={() => setIdx(idx - 1)} className="btn-ghost">
              <ArrowLeft size={15} /> Kembali
            </button>
          ) : (
            <button type="button" onClick={finish} className="btn-ghost">
              Lewati
            </button>
          )}
          {isLast ? (
            <button type="button" onClick={finish} className="btn-primary">
              Mulai Sekarang <ArrowRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={() => setIdx(idx + 1)} className="btn-primary">
              Lanjut <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
