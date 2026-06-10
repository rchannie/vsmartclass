import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../stores/auth'
import Logo from '../../components/ui/Logo'
import Segmented from '../../components/ui/Segmented'

export default function Register() {
  const signUp = useAuth((s) => s.signUp)
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'siswa' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const profile = await signUp(form)
      navigate(profile.role === 'guru' ? '/guru/dashboard' : '/siswa/beranda', { replace: true })
    } catch (err) {
      setError(err.message)
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
          <h1 className="text-lg">Buat akun baru</h1>
          <p className="mt-1 text-sm text-muted">Bergabung sebagai guru atau siswa.</p>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="flex justify-center">
              <Segmented
                options={[
                  { value: 'siswa', label: 'Saya Siswa' },
                  { value: 'guru', label: 'Saya Guru' },
                ]}
                value={form.role}
                onChange={(role) => setForm({ ...form, role })}
              />
            </div>
            <div>
              <label className="label" htmlFor="fullName">Nama lengkap</label>
              <input
                id="fullName" required className="input" placeholder="Nama lengkapmu"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" type="email" required className="input" placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Kata sandi</label>
              <input
                id="password" type="password" required minLength={6} className="input" placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <p className="rounded-md border border-c6 px-3 py-2 text-xs font-bold text-c6">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              <UserPlus size={16} />
              {busy ? 'Memproses…' : 'Daftar'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="font-bold text-accent hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
