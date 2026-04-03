import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutTemplate, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PastelButton } from '../../components/shared'
import { api, getApiErrorMessage } from '../../lib/api'
import { fetchProjects, type Project } from '../../services/projects.api'
import { CreateProjectModal } from './components/CreateProjectModal'
import { DashboardEmptyState } from './components/DashboardEmptyState'
import { DashboardProjectSkeleton } from './components/DashboardProjectSkeleton'
import { DashboardShell } from './components/DashboardShell'
import { ProjectGrid } from './components/ProjectGrid'

type Profile = {
  email: string
  fullName: string
}

function firstName(fullName: string): string {
  const p = fullName.trim().split(/\s+/)[0]
  return p || 'bạn'
}

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProjects = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await fetchProjects()
      setProjects(list)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

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

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  const greetingName = profile?.fullName ? firstName(profile.fullName) : 'bạn'

  return (
    <DashboardShell searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <motion.div
        className="mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <section className="mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col gap-6 rounded-[1.5rem] border border-white/45 bg-gradient-to-br from-white/55 via-white/35 to-sky-light/25 p-6 shadow-soft backdrop-blur-md md:flex-row md:items-center md:justify-between md:p-8"
          >
            <div>
              <p className="font-display text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Xin chào, {greetingName}!
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
                Sẵn sàng thêm một thế giới mới? Tạo game, kéo asset, và nhờ AI chỉnh scene trong vài phút.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <PastelButton
                  variant="secondary"
                  type="button"
                  className="gap-2 px-8 py-3 text-base font-bold shadow-soft-hover"
                  onClick={() => setModalOpen(true)}
                >
                  <Sparkles className="h-5 w-5" strokeWidth={2} />
                  Tạo game mới
                </PastelButton>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/templates"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-sky-dark/30 bg-white/55 px-8 py-3 text-base font-bold text-sky-dark shadow-sm backdrop-blur-sm transition hover:border-sky-dark/50 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/35"
                >
                  <LayoutTemplate className="h-5 w-5" strokeWidth={2} aria-hidden />
                  Từ template
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="mb-6 flex items-end justify-between gap-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-800 md:text-xl">Game của bạn</h2>
          {!loading && projects.length > 0 ? (
            <p className="text-sm font-medium text-slate-500">
              {filteredProjects.length} game
              {searchQuery.trim() ? ' khớp tìm kiếm' : ''}
            </p>
          ) : null}
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-800 shadow-sm"
          >
            {error}
          </motion.div>
        ) : null}

        {loading ? (
          <DashboardProjectSkeleton count={6} />
        ) : filteredProjects.length === 0 && !searchQuery.trim() ? (
          <DashboardEmptyState onCreateClick={() => setModalOpen(true)} />
        ) : filteredProjects.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-glass border border-white/45 bg-white/35 px-6 py-12 text-center text-sm text-slate-600 backdrop-blur-sm"
          >
            Không tìm thấy game phù hợp. Thử từ khóa khác nhé.
          </motion.p>
        ) : (
          <ProjectGrid projects={filteredProjects} onProjectDeleted={() => void loadProjects()} />
        )}
      </motion.div>

      <AnimatePresence>
        {modalOpen ? (
          <CreateProjectModal
            key="create-project"
            onClose={() => setModalOpen(false)}
            onCreated={() => void loadProjects()}
          />
        ) : null}
      </AnimatePresence>
    </DashboardShell>
  )
}
