import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Search, Sparkles } from 'lucide-react'
import { SmartInput } from '../../../components/shared'
import { api } from '../../../lib/api'
import { useAuth } from '../../../hooks/useAuth'
import { cn } from '../../../lib/utils'

type Profile = {
  email: string
  fullName: string
}

type DashboardHeaderProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function DashboardHeader({ searchQuery, onSearchChange }: DashboardHeaderProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileUserRef = useRef<HTMLDivElement>(null)
  const desktopUserRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ success: boolean; data: Profile }>('/auth/profile')
      .then((res) => {
        if (!cancelled) setProfile(res.data.data)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node
      if (mobileUserRef.current?.contains(t) || desktopUserRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate('/auth/login', { replace: true })
  }

  const initials = profile?.fullName
    ? profile.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : '?'

  return (
    <header
      className={cn(
        'dashboard-backdrop-blur sticky top-0 z-30 border-b border-white/45 bg-white/40 px-4 py-3 backdrop-blur-xl md:px-6',
        'shadow-[0_1px_0_rgba(255,255,255,0.85)]',
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center justify-between gap-3 md:contents">
          <Link
            to="/dashboard"
            className="group flex shrink-0 items-center gap-3 rounded-2xl pr-2 transition hover:bg-white/30"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-sky-dark via-sky-light to-white opacity-70 blur-sm transition group-hover:opacity-90" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-dark to-[#5eb8e0] shadow-soft ring-2 ring-white/80">
                <Sparkles className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              </div>
            </div>
            <div className="min-w-0 text-left">
              <p className="font-display text-lg font-bold leading-tight tracking-tight text-slate-800 md:text-xl">
                AI Game Studio
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-dark/75">
                Tạo game bằng AI
              </p>
            </div>
          </Link>

          <div className="relative md:hidden" ref={mobileUserRef}>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/60 text-sm font-bold text-sky-dark shadow-sm"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Menu tài khoản"
            >
              {initials}
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-white/50 bg-white/95 py-2 shadow-soft-hover backdrop-blur-md">
                {profile ? (
                  <div className="border-b border-white/60 px-3 py-2 text-xs text-slate-600">
                    <p className="truncate font-medium text-slate-800">{profile.fullName}</p>
                    <p className="truncate">{profile.email}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <SmartInput
            className="border-white/55 bg-white/50 pl-10 shadow-inner"
            type="search"
            placeholder="Tìm game của bạn…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Tìm game"
          />
        </div>

        <div className="relative hidden shrink-0 md:block" ref={desktopUserRef}>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-2xl border border-white/55 bg-white/45 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-sky-dark/25 hover:bg-white/65"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-light to-white text-sm font-bold text-sky-dark shadow-inner ring-1 ring-sky-dark/15">
              {initials}
            </div>
            <div className="hidden text-left lg:block">
              <p className="max-w-[120px] truncate text-sm font-semibold text-slate-800">
                {profile?.fullName ?? 'Tài khoản'}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Đăng nhập</p>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-white/50 bg-white/95 py-2 shadow-soft-hover backdrop-blur-md">
              {profile ? (
                <div className="border-b border-white/60 px-3 py-2 text-xs text-slate-600">
                  <p className="truncate font-medium text-slate-800">{profile.fullName}</p>
                  <p className="truncate">{profile.email}</p>
                </div>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
