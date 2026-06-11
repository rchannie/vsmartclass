import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, BarChart3, Lightbulb,
  Home, ClipboardList, UserRound, FolderOpen, LogOut, Moon, Sun,
} from 'lucide-react'
import { useAuth } from '../../stores/auth'
import Logo from '../ui/Logo'
import Avatar from '../ui/Avatar'

const NAV = {
  guru: [
    { to: '/guru/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/guru/soal/baru', label: 'Buat Soal', icon: Sparkles },
    { to: '/guru/analitik', label: 'Analitik', icon: BarChart3 },
    { to: '/guru/rekomendasi', label: 'Rekomendasi', icon: Lightbulb },
  ],
  siswa: [
    { to: '/siswa/beranda', label: 'Beranda', icon: Home },
    { to: '/siswa/tugas', label: 'Tugas', icon: ClipboardList },
    { to: '/siswa/profil', label: 'Profil Bloom', icon: UserRound },
    { to: '/siswa/rekomendasi', label: 'Rekomendasi', icon: Lightbulb },
    { to: '/siswa/proyek', label: 'Proyek', icon: FolderOpen },
  ],
}

const THEME_KEY = 'vsc-theme'

export default function AppLayout({ role }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV[role] || []

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const handleSignOut = async () => {
    await signOut()
    navigate('/masuk')
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5">
          <Logo size="sm" textClassName="text-base" />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-muted hover:bg-bg hover:text-ink'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <Avatar name={profile?.full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">{profile?.full_name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{role}</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-pill p-1.5 text-muted hover:bg-bg hover:text-ink"
              title="Ganti tema"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-pill p-1.5 text-muted hover:bg-bg hover:text-c6"
              title="Keluar"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Topbar — mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <Logo size="sm" textClassName="text-sm" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-pill p-2 text-muted"
            title="Ganti tema"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" onClick={handleSignOut} className="rounded-pill p-2 text-muted" title="Keluar">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Konten */}
      <main className="min-w-0 flex-1 pb-20 md:ml-60 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab — mobile (breakpoint 768px, UX rule #7) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
