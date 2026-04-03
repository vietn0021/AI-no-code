import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Layers,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Redo2,
  Sparkles,
  Undo2,
  UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../lib/utils'
import { PastelButton } from '../../components/shared'
import { useEditorStore } from '../../store/useEditorStore'
import { AiChatPanel } from './AiChatPanel'
import { EditorRightColumn } from './components/EditorRightColumn'
import { GameCanvas } from './components/GameCanvas'
import { GameRuntime } from './components/GameRuntime'
import {
  fetchProjectById,
  normalizeGameConfigForEditor,
  patchProjectGameConfig,
  patchProjectPartial,
} from '../../services/projects.api'
import { confirmEntityDelete } from './lib/confirmEntityDelete'

const panelEase = [0.22, 1, 0.36, 1] as const
const panelTransition = { duration: 0.4, ease: panelEase }

export function EditorPage() {
  const { projectId } = useParams()
  const setCurrentProject = useEditorStore((s) => s.setCurrentProject)
  const currentProject = useEditorStore((s) => s.currentProject)
  const isLoading = useEditorStore((s) => s.isLoading)
  const gameConfig = useEditorStore((s) => s.gameConfig)
  const setGameConfig = useEditorStore((s) => s.setGameConfig)
  const setSelectedEntityId = useEditorStore((s) => s.setSelectedEntityId)
  const history = useEditorStore((s) => s.history)
  const historyIndex = useEditorStore((s) => s.historyIndex)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  const [isRenamingProject, setIsRenamingProject] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [isRenamingSaving, setIsRenamingSaving] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const skipRenameBlurCommit = useRef(false)

  const displayProjectName =
    currentProject?.name?.trim() ||
    (projectId && projectId.length > 10 ? `${projectId.slice(0, 8)}…` : projectId) ||
    'Dự án'

  useEffect(() => {
    if (isRenamingProject) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenamingProject])

  useEffect(() => {
    if (projectId) {
      setCurrentProject({ id: projectId })
    }
  }, [projectId, setCurrentProject])

  const [isFetchingProject, setIsFetchingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)

  // Auto-load gameConfig khi vào trang Studio.
  useEffect(() => {
    async function load() {
      if (!projectId) return
      setIsFetchingProject(true)
      try {
        const project = await fetchProjectById(projectId)
        setCurrentProject({
          id: projectId,
          name: project.name?.trim() || undefined,
          description: project.description,
        })
        if (project.gameConfig != null) {
          setGameConfig(normalizeGameConfigForEditor(project.gameConfig))
          setSelectedEntityId(null)
        }
      } catch (e) {
        toast.error('Không tải được dự án. Vui lòng thử lại.')
      } finally {
        setIsFetchingProject(false)
      }
    }

    void load()
  }, [projectId, setCurrentProject, setGameConfig, setSelectedEntityId])

  async function commitProjectRename() {
    if (!projectId) return
    const next = renameDraft.trim()
    if (!next) {
      setIsRenamingProject(false)
      return
    }
    if (next === (currentProject?.name?.trim() || '')) {
      setIsRenamingProject(false)
      return
    }
    setIsRenamingSaving(true)
    try {
      const updated = await patchProjectPartial(projectId, { name: next })
      setCurrentProject({
        id: projectId,
        name: updated.name,
        description: updated.description,
      })
      setIsRenamingProject(false)
      toast.success('Đã đổi tên dự án.')
    } catch {
      toast.error('Không lưu được tên. Thử lại.')
    } finally {
      setIsRenamingSaving(false)
    }
  }

  function onRenameKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitProjectRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      skipRenameBlurCommit.current = true
      setIsRenamingProject(false)
    }
  }

  function onRenameBlur() {
    if (skipRenameBlurCommit.current) {
      skipRenameBlurCommit.current = false
      return
    }
    void commitProjectRename()
  }

  async function onSaveProject() {
    if (!projectId) {
      toast.error('Thiếu projectId trên URL.')
      return
    }
    setIsSavingProject(true)
    try {
      await patchProjectGameConfig(projectId, gameConfig)
      toast.success('Đã lưu thành công!')
    } catch (e) {
      // API server sẽ trả {success:false, message}, axios interceptors sẽ giúp hiển thị thông tin phù hợp.
      toast.error('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setIsSavingProject(false)
    }
  }

  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [canvasMode, setCanvasMode] = useState<'preview' | 'play'>('preview')

  // Ctrl+Z / Ctrl+Y (Cmd trên macOS): undo / redo — không áp dụng khi focus trong input.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        useEditorStore.getState().undo()
      } else if (key === 'y') {
        e.preventDefault()
        useEditorStore.getState().redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Delete / Backspace: xóa vật thể đang chọn (không áp dụng khi đang gõ trong input).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return

      const { selectedEntityId: sid, gameConfig: gc, removeEntity: rm } =
        useEditorStore.getState()
      if (!sid) return

      e.preventDefault()
      const ent = gc.entities.find((x) => x.id === sid)
      const name = ent?.id ?? sid
      if (!confirmEntityDelete(name)) return
      rm(sid)
      toast.success('Đã xóa vật thể.')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const leftWidth = leftOpen ? 300 : 52
  const rightWidth = rightOpen ? 250 : 52

  const entityCount = Array.isArray(gameConfig.entities) ? gameConfig.entities.length : 0
  const showCanvasEmptyState = entityCount === 0

  return (
    <div className="flex h-screen min-h-0 flex-col bg-bg-alice-blue">
      <header className="dashboard-backdrop-blur grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-white/45 bg-white/40 px-3 py-2.5 backdrop-blur-md md:gap-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link
            to="/dashboard"
            className="group flex shrink-0 items-center gap-1.5 rounded-xl border border-white/50 bg-white/45 px-2.5 py-2 text-sm font-semibold text-sky-dark shadow-sm backdrop-blur-sm transition hover:border-sky-dark/25 hover:bg-white/80 md:px-3"
            title="Về Dashboard"
          >
            <ArrowLeft
              className="h-4 w-4 transition group-hover:-translate-x-0.5"
              strokeWidth={2.25}
              aria-hidden
            />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="hidden h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-white/70 to-transparent sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            {isRenamingProject ? (
              <input
                ref={renameInputRef}
                value={renameDraft}
                disabled={isRenamingSaving}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={onRenameBlur}
                onKeyDown={onRenameKeyDown}
                className="w-full min-w-0 rounded-lg border border-sky-dark/25 bg-white/90 px-2.5 py-1.5 font-display text-base font-bold tracking-tight text-slate-800 shadow-inner outline-none ring-sky-dark/20 focus:ring-2 md:text-lg"
                aria-label="Tên dự án"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenameDraft(currentProject?.name?.trim() || displayProjectName)
                  setIsRenamingProject(true)
                }}
                className="group flex max-w-full min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-white/50"
                title="Nhấn để đổi tên"
              >
                <h1 className="truncate font-display text-base font-bold tracking-tight text-slate-800 md:text-lg">
                  {displayProjectName}
                </h1>
                <Pencil
                  className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>

        <div
          className="flex justify-center px-1"
          role="group"
          aria-label="Chế độ canvas"
        >
          <div className="inline-flex rounded-full border border-white/55 bg-white/40 p-1 shadow-inner backdrop-blur-md">
            <button
              type="button"
              className={cn(
                'relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition md:px-5 md:text-[0.7rem]',
                canvasMode === 'preview'
                  ? 'bg-gradient-to-b from-sky-light/95 to-sky-light/70 text-sky-dark shadow-md ring-1 ring-sky-dark/20'
                  : 'text-slate-500 hover:bg-white/45 hover:text-slate-700',
              )}
              aria-pressed={canvasMode === 'preview'}
              onClick={() => setCanvasMode('preview')}
            >
              Preview
            </button>
            <button
              type="button"
              className={cn(
                'relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition md:px-5 md:text-[0.7rem]',
                canvasMode === 'play'
                  ? 'bg-gradient-to-b from-emerald-200/95 to-emerald-100/80 text-emerald-900 shadow-md ring-1 ring-emerald-500/35'
                  : 'text-slate-500 hover:bg-white/45 hover:text-slate-700',
              )}
              aria-pressed={canvasMode === 'play'}
              onClick={() => {
                setSelectedEntityId(null)
                setCanvasMode('play')
              }}
            >
              Play
            </button>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            title="Hoàn tác (Ctrl+Z)"
            aria-label="Hoàn tác"
            disabled={historyIndex <= 0}
            onClick={() => undo()}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/55 text-sky-dark shadow-sm backdrop-blur-sm transition',
              'hover:bg-white/85 disabled:pointer-events-none disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/30',
            )}
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            title="Làm lại (Ctrl+Y)"
            aria-label="Làm lại"
            disabled={historyIndex >= history.length - 1}
            onClick={() => redo()}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/55 text-sky-dark shadow-sm backdrop-blur-sm transition',
              'hover:bg-white/85 disabled:pointer-events-none disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/30',
            )}
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <span
            className="mx-0.5 hidden h-7 w-px shrink-0 bg-gradient-to-b from-transparent via-slate-300/80 to-transparent sm:block"
            aria-hidden
          />
          <PastelButton
            variant="secondary"
            size="sm"
            loading={isSavingProject}
            disabled={isFetchingProject || isSavingProject}
            onClick={() => void onSaveProject()}
            className="shrink-0 shadow-sm"
          >
            Lưu dự án
          </PastelButton>
          <Link
            to="/dashboard"
            className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-light to-sky-dark/90 text-white shadow-md ring-2 ring-white/70 transition hover:brightness-105 hover:ring-white"
            title="Tài khoản / Dashboard"
            aria-label="Về Dashboard"
          >
            <UserRound className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-0 p-2 md:p-3">
        {/* Left — AI Chat */}
        <motion.aside
          className="flex shrink-0 flex-col overflow-hidden rounded-glass border border-white/50 bg-sky-light/20 shadow-soft backdrop-blur-md"
          initial={false}
          animate={{ width: leftWidth }}
          transition={panelTransition}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div
              className={cn(
                'flex shrink-0 items-center border-b border-white/40 py-2.5',
                leftOpen ? 'justify-between px-3' : 'flex-col gap-3 px-1.5',
              )}
            >
              {leftOpen ? (
                <motion.div
                  key="label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm font-semibold text-sky-dark"
                >
                  <MessageSquare className="h-4 w-4" />
                  AI Chat
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLeftOpen(true)}
                  className="rounded-xl p-2 text-sky-dark transition hover:bg-white/45"
                  title="AI Chat — mở bảng trò chuyện"
                  aria-label="Mở AI Chat"
                >
                  <MessageSquare className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => setLeftOpen((v) => !v)}
                className="rounded-lg p-1.5 text-sky-dark transition hover:bg-white/40"
                aria-expanded={leftOpen}
                title={leftOpen ? 'Thu gọn bảng AI' : 'Mở rộng bảng AI'}
                aria-label={leftOpen ? 'Thu gọn chat' : 'Mở chat'}
              >
                {leftOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {leftOpen ? (
                <motion.div
                  key="chat-open"
                  className="flex min-h-0 flex-1 flex-col"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.3, ease: panelEase }}
                >
                  <AiChatPanel projectId={projectId} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* Center — canvas */}
        <main className="glass-surface relative mx-1 flex min-w-0 flex-1 flex-col overflow-hidden rounded-glass border border-white/50 bg-white/20 shadow-soft backdrop-blur-md md:mx-2">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(148, 163, 184, 0.2) 1.25px, transparent 1.25px)',
              backgroundSize: '20px 20px',
            }}
            aria-hidden
          />
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 md:p-7">
            <div
              className={cn(
                'relative aspect-video w-full max-w-4xl overflow-hidden rounded-[1.35rem] bg-white/90',
                'shadow-[0_22px_50px_-12px_rgba(15,23,42,0.2),0_0_0_1px_rgba(255,255,255,0.65)]',
                'ring-1 ring-slate-900/[0.06]',
                canvasMode === 'play' &&
                  'shadow-[0_24px_56px_-14px_rgba(16,185,129,0.35),0_0_0_1px_rgba(167,243,208,0.5),0_0_48px_-6px_rgba(52,211,153,0.35)] ring-emerald-400/45',
                isLoading && 'animate-pulse',
              )}
            >
              {canvasMode === 'preview' ? (
                <GameCanvas className="h-full min-h-[180px] rounded-[1.35rem] border border-slate-200/80" />
              ) : (
                <GameRuntime className="h-full min-h-[180px] rounded-[1.35rem] border border-emerald-200/60" />
              )}
              {showCanvasEmptyState ? (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[1.35rem] bg-gradient-to-b from-white/15 via-white/55 to-white/80 px-6 text-center backdrop-blur-[2px]"
                  aria-hidden
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-light/90 to-sky-dark/20 text-sky-dark shadow-lg ring-2 ring-white/80">
                    <Sparkles className="h-10 w-10" strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className="max-w-xs font-display text-base font-semibold leading-snug text-slate-700 md:text-lg">
                    Nhắn AI bên trái để tạo game đầu tiên
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        {/* Right — Layers */}
        <motion.aside
          className="flex shrink-0 flex-col overflow-hidden rounded-glass border border-white/50 bg-sky-light/20 shadow-soft backdrop-blur-md"
          initial={false}
          animate={{ width: rightWidth }}
          transition={panelTransition}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div
              className={cn(
                'flex shrink-0 items-center border-b border-white/40 py-2.5',
                rightOpen ? 'justify-between px-3' : 'flex-col gap-3 px-1.5',
              )}
            >
              {rightOpen ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm font-semibold text-sky-dark"
                >
                  <Layers className="h-4 w-4" />
                  Layers
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRightOpen(true)}
                  className="rounded-xl p-2 text-sky-dark transition hover:bg-white/45"
                  title="Layers — mở bảng lớp & inspector"
                  aria-label="Mở Layers"
                >
                  <Layers className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => setRightOpen((v) => !v)}
                className="rounded-lg p-1.5 text-sky-dark transition hover:bg-white/40"
                aria-expanded={rightOpen}
                title={rightOpen ? 'Thu gọn Layers' : 'Mở rộng Layers'}
                aria-label={rightOpen ? 'Thu gọn inspector' : 'Mở inspector'}
              >
                {rightOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {rightOpen ? (
                <motion.div
                  key="inspector-open"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.3, ease: panelEase }}
                >
                  <EditorRightColumn projectId={projectId} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}
