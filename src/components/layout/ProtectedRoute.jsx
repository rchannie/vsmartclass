import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../stores/auth'

// Cek auth + role. Role salah → lempar ke beranda role-nya sendiri.
export default function ProtectedRoute({ role, children }) {
  const { user, profile, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/masuk" state={{ from: location.pathname }} replace />

  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'guru' ? '/guru/dashboard' : '/siswa/beranda'} replace />
  }

  return children
}
