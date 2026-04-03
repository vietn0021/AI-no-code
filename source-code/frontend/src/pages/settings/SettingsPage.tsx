import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, LogOut, Palette, Save, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { PastelButton, SmartInput } from '../../components/shared'
import { api, getApiErrorMessage } from '../../lib/api'
import { getGlassEffectsEnabled, setGlassEffectsEnabled } from '../../lib/glassEffectsPref'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { DashboardShell } from '../dashboard/components/DashboardShell'

const pageEase = [0.22, 1, 0.36, 1] as const

type Profile = {
  id: string
  email: string
  fullName: string
  createdAt?: string
}

type SettingsSection = 'account' | 'security' | 'appearance'

const navItems: { id: SettingsSection; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Tài khoản', icon: User },
  { id: 'security', label: 'Bảo mật', icon: Shield },
  { id: 'appearance', label: 'Giao diện', icon: Palette },
]

function formatJoinedAt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const fieldLabelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500'

export function SettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [glassOn, setGlassOn] = useState(() => getGlassEffectsEnabled())

  const [baselineFullName, setBaselineFullName] = useState('')
  const [baselineGlass, setBaselineGlass] = useState(() => getGlassEffectsEnabled())

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const sections = navItems.map((n) => document.getElementById(`settings-section-${n.id}`)).filter(Boolean)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = visible?.target?.id?.replace('settings-section-', '') as SettingsSection | undefined
        if (id && navItems.some((n) => n.id === id)) {
          setActiveSection(id)
        }
      },
      { root: null, rootMargin: '-12% 0px -50% 0px', threshold: [0.08, 0.2, 0.35] },
    )

    sections.forEach((el) => observer.observe(el!))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .get<{ success: boolean; data: Profile }>('/auth/profile')
      .then((res) => {
        if (!cancelled) {
          const p = res.data.data
          setProfile(p)
          setFullNameDraft(p.fullName ?? '')
          setBaselineFullName(p.fullName ?? '')
          setLoadError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err))
          setProfile(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isDirty = useMemo(() => {
    return (
      fullNameDraft.trim() !== baselineFullName.trim() ||
      glassOn !== baselineGlass
    )
  }, [fullNameDraft, baselineFullName, glassOn, baselineGlass])

  function handleGlassToggle(next: boolean) {
    setGlassOn(next)
  }

  const handleSave = useCallback(async () => {
    const name = fullNameDraft.trim()
    if (!name) {
      toast.error('Họ tên không được để trống.')
      return
    }
    setSaving(true)
    try {
      setGlassEffectsEnabled(glassOn)
      if (name !== baselineFullName.trim()) {
        const { data } = await api.patch<{ success: boolean; data: Profile }>('/auth/profile', {
          fullName: name,
        })
        setProfile(data.data)
        setBaselineFullName(data.data.fullName ?? '')
        setFullNameDraft(data.data.fullName ?? '')
      }
      setBaselineGlass(glassOn)
      toast.success('Đã lưu cài đặt.')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [fullNameDraft, baselineFullName, glassOn])

  function handleLogout() {
    logout()
    navigate('/auth/login', { replace: true })
  }

  function scrollToSection(id: SettingsSection) {
    setActiveSection(id)
    document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <DashboardShell searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: pageEase }}
        className="relative mx-auto max-w-5xl pb-28 md:pb-24"
      >
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-sky-dark md:text-4xl">
            Cài đặt
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Quản lý tài khoản, bảo mật và giao diện ứng dụng.
          </p>
        </header>

        {loadError ? (
          <p className="mb-6 rounded-2xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-sm">
            {loadError}
          </p>
        ) : null}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {/* Sidebar menu */}
          <aside className="lg:w-52 lg:shrink-0">
            <nav
              className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
              aria-label="Mục cài đặt"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                const active = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition',
                      active
                        ? 'bg-gradient-to-r from-white/80 to-sky-light/40 text-sky-dark shadow-md ring-1 ring-sky-dark/20'
                        : 'text-slate-600 hover:bg-white/40 hover:text-sky-dark',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-10">
            <motion.section
              id="settings-section-account"
              initial={false}
              animate={{ opacity: 1 }}
              className="scroll-mt-24 rounded-[1.35rem] border border-white/50 bg-white/35 p-5 shadow-soft backdrop-blur-md md:p-7"
            >
              <div className="mb-6 flex items-center gap-3 border-b border-white/40 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-light/60 text-sky-dark shadow-inner ring-1 ring-white/60">
                  <User className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-800">Tài khoản</h2>
                  <p className="text-xs text-slate-500">Thông tin đăng nhập và hồ sơ hiển thị.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <span className={fieldLabelClass}>Họ và tên</span>
                  <SmartInput
                    value={fullNameDraft}
                    onChange={(e) => setFullNameDraft(e.target.value)}
                    placeholder="Nhập họ tên"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <span className={fieldLabelClass}>Email</span>
                  <SmartInput
                    value={profile?.email ?? ''}
                    readOnly
                    className="cursor-default bg-white/40"
                    title="Email không đổi tại đây"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Email dùng để đăng nhập — liên hệ hỗ trợ nếu cần đổi.
                  </p>
                </div>
                <div className="rounded-xl border border-white/45 bg-white/25 px-4 py-3">
                  <span className={fieldLabelClass}>Ngày tham gia</span>
                  <p className="text-sm font-medium text-slate-800">
                    {formatJoinedAt(profile?.createdAt)}
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              id="settings-section-security"
              className="scroll-mt-24 rounded-[1.35rem] border border-white/50 bg-white/35 p-5 shadow-soft backdrop-blur-md md:p-7"
            >
              <div className="mb-6 flex items-center gap-3 border-b border-white/40 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-sky-dark shadow-inner ring-1 ring-white/60">
                  <Shield className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-800">Bảo mật</h2>
                  <p className="text-xs text-slate-500">Mật khẩu và khôi phục tài khoản.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-sky-dark/25 bg-gradient-to-br from-white/50 to-sky-light/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-sky-dark shadow-sm ring-1 ring-white/70">
                      <KeyRound className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">Đặt lại mật khẩu</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Gửi liên kết đặt lại mật khẩu qua email đã đăng ký.
                      </p>
                    </div>
                  </div>
                  <Link to="/auth/forgot-password" className="shrink-0">
                    <PastelButton variant="secondary" size="sm" type="button" className="w-full sm:w-auto">
                      Quên mật khẩu?
                    </PastelButton>
                  </Link>
                </div>
              </div>
            </motion.section>

            <motion.section
              id="settings-section-appearance"
              className="scroll-mt-24 rounded-[1.35rem] border border-white/50 bg-white/35 p-5 shadow-soft backdrop-blur-md md:p-7"
            >
              <div className="mb-6 flex items-center gap-3 border-b border-white/40 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-light to-white text-sky-dark shadow-inner ring-1 ring-white/60">
                  <Palette className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-800">Giao diện</h2>
                  <p className="text-xs text-slate-500">Tùy chỉnh hiệu ứng và độ trong suốt.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Hiệu ứng Glassmorphism</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Tắt để giảm blur trên thẻ kính và thanh điều hướng (máy yếu).
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={glassOn}
                  onClick={() => handleGlassToggle(!glassOn)}
                  className={cn(
                    'relative h-9 w-16 shrink-0 rounded-full border border-white/50 shadow-inner transition-colors',
                    glassOn ? 'bg-sky-dark' : 'bg-slate-300/90',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-transform',
                      glassOn ? 'translate-x-8' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </motion.section>

            <section className="rounded-[1.35rem] border border-red-100/80 bg-red-50/40 p-5 backdrop-blur-sm md:p-6">
              <PastelButton
                variant="danger"
                size="lg"
                type="button"
                className="w-full gap-2 sm:w-auto"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
                Đăng xuất
              </PastelButton>
            </section>
          </div>
        </div>

        {/* Sticky save bar */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/45 bg-white/55 px-4 py-3 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
            <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-xs text-slate-500 sm:block">
                {isDirty ? 'Bạn có thay đổi chưa lưu.' : 'Mọi thay đổi đã được lưu.'}
              </p>
              <div className="flex gap-2 sm:ml-auto">
                <PastelButton
                  variant="primary"
                  size="md"
                  type="button"
                  loading={saving}
                  disabled={saving || !isDirty}
                  onClick={() => void handleSave()}
                  className="min-w-[140px] gap-2"
                >
                  <Save className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  Lưu cài đặt
                </PastelButton>
              </div>
            </div>
        </div>
      </motion.div>
    </DashboardShell>
  )
}
