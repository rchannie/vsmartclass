import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import { isSupabaseConfigured } from '../../lib/supabase'
import Logo from '../../components/ui/Logo'

const DEMO_ACCOUNTS = [
  { label: 'Masuk sebagai Guru', email: 'ratna@sma3bdg.sch.id', password: 'guru123' },
  { label: 'Masuk sebagai Siswa', email: 'aisyah@siswa.com', password: 'siswa123' },
]

export default function Login() {
  const signIn = useAuth((s) => s.signIn)
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const go = (profile) => {
    const from = location.state?.from
    if (from && from.startsWith('/bergabung')) return navigate(from, { replace: true })
    navigate(profile.role === 'guru' ? '/guru/dashboard' : '/siswa/beranda', { replace: true })
  }

  const submit = async (email, password) => {
    setBusy(true)
    setError('')
    try {
      const profile = await signIn(email, password)
      go(profile)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" textClassName="text-xl" />
        </div>

        <div className="card p-6">
          <h1 className="text-lg">Selamat datang kembali</h1>
          <p className="mt-1 text-sm text-muted">Masuk untuk melanjutkan pembelajaran adaptifmu.</p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              submit(form.email, form.password)
            }}
          >
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" type="email" required className="input" placeholder="nama@sekolah.sch.id"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Kata sandi</label>
              <input
                id="password" type="password" required className="input" placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <p className="rounded-md border border-c6 px-3 py-2 text-xs font-bold text-c6">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              <LogIn size={16} />
              {busy ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Belum punya akun?{' '}
            <Link to="/daftar" className="font-bold text-accent hover:underline">Daftar di sini</Link>
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-4 rounded-lg border border-dashed border-line bg-surface p-4">
            <p className="text-center text-[11px] font-bold uppercase tracking-wide text-muted">
              Mode demo — coba cepat
            </p>
            <div className="mt-2.5 flex gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  disabled={busy}
                  onClick={() => submit(a.email, a.password)}
                  className="btn-outline flex-1 !px-2 text-xs"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
