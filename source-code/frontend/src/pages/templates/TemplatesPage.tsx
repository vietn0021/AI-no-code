import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, LayoutTemplate, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { PastelButton } from '../../components/shared'
import { getApiErrorMessage } from '../../lib/api'
import { cn } from '../../lib/utils'
import { createProject } from '../../services/projects.api'
import {
  buildInitialGameConfigFromTemplate,
  getTemplates,
  type GameTemplateDto,
} from '../../services/templates.api'
import { DashboardShell } from '../dashboard/components/DashboardShell'

const pageEase = [0.22, 1, 0.36, 1] as const

type CategoryFilter = 'all' | 'classic' | 'arcade'

const FILTER_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'classic', label: 'Classic' },
  { id: 'arcade', label: 'Arcade' },
]

function normalizeCategory(cat: string): string {
  return cat.trim().toLowerCase()
}

function categoryBadgeClass(cat: string): string {
  const c = normalizeCategory(cat)
  if (c === 'arcade') {
    return 'bg-fuchsia-100/95 text-fuchsia-900 ring-fuchsia-300/50'
  }
  if (c === 'puzzle') {
    return 'bg-emerald-100/95 text-emerald-900 ring-emerald-300/50'
  }
  if (c === 'classic') {
    return 'bg-amber-100/95 text-amber-950 ring-amber-300/50'
  }
  return 'bg-slate-100/95 text-slate-700 ring-slate-300/50'
}

function thumbnailGradientForCategory(cat: string): string {
  const c = normalizeCategory(cat)
  if (c === 'arcade') return 'from-fuchsia-200/90 via-sky-light to-indigo-100/80'
  if (c === 'puzzle') return 'from-emerald-200/85 via-teal-100/70 to-sky-light'
  return 'from-amber-100/90 via-sky-light to-slate-200/70'
}

function resolveThumbnailSrc(thumbnail: string): string {
  const t = thumbnail.trim()
  if (!t) return ''
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('/')) return `${window.location.origin}${t}`
  return t
}

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.085, delayChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.34, ease: pageEase },
  },
}

function TemplateCard({
  template,
  busy,
  onUse,
}: {
  template: GameTemplateDto
  busy: boolean
  onUse: (t: GameTemplateDto) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = resolveThumbnailSrc(template.thumbnail)
  const showImage = Boolean(src) && !imgFailed
  const badgeCat = normalizeCategory(template.category) || 'classic'

  return (
    <motion.article
      layout
      variants={cardVariants}
      className="flex flex-col overflow-hidden rounded-[1.25rem] border border-white/55 bg-white/40 shadow-soft backdrop-blur-md transition hover:border-sky-dark/35 hover:shadow-lg"
    >
      <div
        className={cn(
          'relative aspect-[16/10] overflow-hidden bg-gradient-to-br',
          thumbnailGradientForCategory(template.category),
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        ) : null}
        {!showImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <motion.div
              animate={{ y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/70 bg-white/35 shadow-lg backdrop-blur-sm"
            >
              <Gamepad2 className="h-8 w-8 text-sky-dark/80" strokeWidth={1.6} aria-hidden />
            </motion.div>
            <span className="rounded-full bg-white/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-white/60 backdrop-blur-sm">
              Xem trước mẫu
            </span>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.5),transparent_50%)]" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span
          className={cn(
            'mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1',
            categoryBadgeClass(badgeCat),
          )}
        >
          {badgeCat}
        </span>
        <h2 className="font-display text-lg font-bold text-slate-800">{template.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{template.description}</p>
        <PastelButton
          variant="secondary"
          size="sm"
          type="button"
          className="mt-4 w-full"
          loading={busy}
          disabled={busy}
          onClick={() => onUse(template)}
        >
          Dùng template
        </PastelButton>
      </div>
    </motion.article>
  )
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [templates, setTemplates] = useState<GameTemplateDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [usingId, setUsingId] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const list = await getTemplates()
      setTemplates(list)
    } catch (e) {
      setLoadError(getApiErrorMessage(e))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const filtered = useMemo(() => {
    let list = templates
    if (categoryFilter !== 'all') {
      list = list.filter((t) => normalizeCategory(t.category) === categoryFilter)
    }
    return list
  }, [templates, categoryFilter])

  const showFilteredEmpty = !loading && !loadError && templates.length > 0 && filtered.length === 0
  const showGlobalEmpty = !loading && !loadError && templates.length === 0

  async function handleUseTemplate(tpl: GameTemplateDto) {
    setUsingId(tpl.id)
    try {
      const gameConfig = buildInitialGameConfigFromTemplate(tpl)
      const project = await createProject({
        name: tpl.name,
        description: tpl.description,
        gameConfig,
      })
      toast.success('Đã tạo dự án từ mẫu.')
      navigate(`/studio/${project.id}`, { replace: true })
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setUsingId(null)
    }
  }

  return (
    <DashboardShell searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: pageEase }}
        className="mx-auto max-w-6xl"
      >
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-sky-dark md:text-4xl">
            Chọn mẫu game
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Gallery mẫu từ máy chủ — một lần bấm để tạo dự án và mở Studio ngay.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Thể loại</p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc template">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={categoryFilter === tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition',
                  categoryFilter === tab.id
                    ? 'bg-sky-dark text-white shadow-md ring-2 ring-sky-dark/25'
                    : 'border border-white/60 bg-white/45 text-slate-600 hover:bg-white/70',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadError ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-800"
          >
            {loadError}
          </motion.div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/45 bg-white/30 py-20 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-sky-dark" aria-hidden />
            <span className="text-sm font-medium text-slate-600">Đang tải mẫu…</span>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {showGlobalEmpty ? (
            <motion.div
              key="empty-global"
              role="status"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: pageEase }}
              className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-sky-dark/25 bg-white/30 px-6 py-20 text-center backdrop-blur-md"
            >
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-light/70 text-sky-dark shadow-soft ring-2 ring-white/70">
                <LayoutTemplate className="h-8 w-8" strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="font-display text-lg font-bold text-slate-800">Chưa có template</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Máy chủ chưa trả danh sách mẫu. Thử lại sau hoặc tạo game trống từ Dashboard.
              </p>
              <PastelButton variant="primary" className="mt-6" type="button" onClick={() => navigate('/dashboard')}>
                Về Dashboard
              </PastelButton>
            </motion.div>
          ) : null}

          {showFilteredEmpty ? (
            <motion.div
              key="empty-filter"
              role="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-[1.5rem] border border-white/50 bg-white/25 px-6 py-16 text-center backdrop-blur-md"
            >
              <Sparkles className="mb-3 h-10 w-10 text-sky-dark/60" strokeWidth={1.5} aria-hidden />
              <h2 className="font-display text-lg font-bold text-slate-800">Không có mẫu trong mục này</h2>
              <p className="mt-2 text-sm text-slate-600">Chọn &quot;Tất cả&quot; hoặc thể loại khác.</p>
              <PastelButton variant="ghost" className="mt-5" type="button" onClick={() => setCategoryFilter('all')}>
                Xem tất cả
              </PastelButton>
            </motion.div>
          ) : null}

          {!loading && !loadError && filtered.length > 0 ? (
            <motion.div
              key="grid"
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  busy={usingId === tpl.id}
                  onUse={handleUseTemplate}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </DashboardShell>
  )
}
