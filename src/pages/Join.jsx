import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KeyRound, LogIn } from 'lucide-react'
import { useAuth } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import * as api from '../lib/api'
import Logo from '../components/ui/Logo'

// Landing join workspace via tautan /bergabung/:code
export default function Join() {
  const { code } = useParams()
  const { user, profile, status } = useAuth()
  const setActive = useWorkspaceStore((s) => s.setActive)
  const navigate = useNavigate()
  const [ws, setWs] = useState(undefined) // undefined = mencari, null = tak ada
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.findWorkspaceByCode(code).then(setWs)
  }, [code])

  const join = async () => {
    setBusy(true)
    setError('')
    try {
      const w = await api.joinWorkspace(code, user)
      setActive(w.id)
      navigate('/siswa/beranda', { replace: true })
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
        <div className="card p-6 text-center">
          {ws === undefined || status === 'loading' ? (
            <p className="py-6 text-sm text-muted">Mencari kelas…</p>
          ) : ws === null ? (
            <>
              <h1 className="text-lg">Kode tidak ditemukan</h1>
              <p className="mt-2 text-sm text-muted">
                Kode <span className="font-mono font-bold">{code}</span> tidak terdaftar. Periksa kembali kode dari gurumu.
              </p>
              <Link to="/masuk" className="btn-outline mt-5 w-full">Ke halaman masuk</Link>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Undangan kelas</p>
              <h1 className="mt-1 text-xl">{ws.name}</h1>
              <p className="mt-1 text-sm text-muted">{[ws.school, ws.subject].filter(Boolean).join(' · ')}</p>

              {!user ? (
                <>
                  <p className="mt-4 text-sm text-muted">Masuk atau daftar dulu untuk bergabung.</p>
                  <Link to="/masuk" state={{ from: `/bergabung/${code}` }} className="btn-primary mt-4 w-full">
                    <LogIn size={15} /> Masuk untuk bergabung
                  </Link>
                </>
              ) : profile?.role !== 'siswa' ? (
                <>
                  <p className="mt-4 text-sm text-muted">Akun guru tidak bisa bergabung lewat kode. Buat workspace dari dashboard.</p>
                  <Link to="/guru/dashboard" className="btn-outline mt-4 w-full">Ke Dashboard</Link>
                </>
              ) : (
                <>
                  {error && <p className="mt-3 text-xs font-bold text-c6">{error}</p>}
                  <button type="button" onClick={join} disabled={busy} className="btn-primary mt-5 w-full">
                    <KeyRound size={15} /> {busy ? 'Bergabung…' : 'Gabung ke kelas ini'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
