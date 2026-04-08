import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Gamepad2, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import { fetchPublicPlayBySlug } from '../../services/play.api'
import { GameRuntime } from '../studio/components/GameRuntime'
import type { EditorGameConfig } from '../../store/useEditorStore'

const PLAY_DESCRIPTION = 'Chơi game được tạo bởi AI'

function setMetaDescription(content: string) {
  let el = document.querySelector('meta[name="description"]')
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'description')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function PlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const [status, setStatus] = useState<
    'loading' | 'ok' | 'notfound' | 'error'
  >('loading')
  const [gameConfig, setGameConfig] = useState<EditorGameConfig | null>(null)
  const [gameName, setGameName] = useState('')

  useEffect(() => {
    if (!slug?.trim()) {
      setStatus('notfound')
      return
    }

    let cancelled = false
    setStatus('loading')
    setGameConfig(null)

    void (async () => {
      try {
        const res = await fetchPublicPlayBySlug(slug)
        if (cancelled) return
        setGameConfig(res.gameConfig)
        setGameName(res.name)
        setStatus('ok')
      } catch (e) {
        if (cancelled) return
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          setStatus('notfound')
        } else {
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    const defaultTitle = 'AI Game Studio'
    if (status === 'ok' && gameName) {
      document.title = `${gameName} - AI Game Studio`
      setMetaDescription(PLAY_DESCRIPTION)
    } else if (status === 'notfound') {
      document.title = `Game không tồn tại — ${defaultTitle}`
      setMetaDescription(PLAY_DESCRIPTION)
    } else if (status === 'error') {
      document.title = `Lỗi tải game — ${defaultTitle}`
      setMetaDescription(PLAY_DESCRIPTION)
    } else {
      document.title = `Đang tải… — ${defaultTitle}`
      setMetaDescription(PLAY_DESCRIPTION)
    }
    return () => {
      document.title = defaultTitle
    }
  }, [status, gameName])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(186,230,253,0.55),transparent),linear-gradient(180deg,#f8fafc_0%,#e0f2fe_45%,#f0f9ff_100%)] text-slate-800">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/50 bg-white/35 px-4 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-700 text-white shadow-md ring-2 ring-white/70">
            <Gamepad2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold tracking-tight text-slate-900 md:text-base">
              {status === 'ok'
                ? gameName
                : status === 'loading'
                  ? 'Đang tải…'
                  : 'AI Game Studio'}
            </p>
            <p className="hidden text-[0.65rem] font-medium uppercase tracking-wider text-slate-500 sm:block">
              Play
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-full border border-sky-dark/15 bg-white/70 px-3.5 py-2 text-xs font-bold text-sky-dark shadow-sm backdrop-blur-sm transition hover:border-sky-dark/25 hover:bg-white md:px-4 md:text-sm"
        >
          Tạo game của bạn
        </Link>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col p-2 md:p-3">
        {status === 'loading' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-sky-400/30 blur-2xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-white via-sky-100 to-sky-200 shadow-[0_20px_50px_-12px_rgba(14,165,233,0.45)] ring-2 ring-white/90"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles
                    className="h-11 w-11 text-sky-600"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
            >
              <p className="font-display text-lg font-bold text-slate-800">
                Đang tải game…
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Chuẩn bị canvas Phaser cho bạn
              </p>
            </motion.div>
            <div className="flex h-1 w-48 overflow-hidden rounded-full bg-white/60 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ width: '45%' }}
              />
            </div>
          </div>
        ) : null}

        {status === 'notfound' ? (
          <motion.div
            className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="rounded-3xl border border-white/60 bg-white/50 px-8 py-10 shadow-soft backdrop-blur-md">
              <p className="font-display text-xl font-bold text-slate-800 md:text-2xl">
                Game không tồn tại
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Link có thể đã hết hạn hoặc game chưa được publish.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex rounded-full bg-gradient-to-r from-sky-500 to-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-105"
              >
                Về trang chủ
              </Link>
            </div>
          </motion.div>
        ) : null}

        {status === 'error' ? (
          <motion.div
            className="flex flex-1 flex-col items-center justify-center px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-display text-lg font-bold text-slate-800">
              Không tải được game
            </p>
            <p className="mt-2 text-sm text-slate-600">Thử tải lại trang.</p>
          </motion.div>
        ) : null}

        {status === 'ok' && gameConfig ? (
          <motion.div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem]',
              'border border-white/55 bg-white/25 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.2)] backdrop-blur-md',
            )}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="relative min-h-0 flex-1 p-1 md:p-2">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.4]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(148, 163, 184, 0.18) 1.25px, transparent 1.25px)',
                  backgroundSize: '18px 18px',
                }}
                aria-hidden
              />
              <GameRuntime
                gameConfig={gameConfig}
                className="relative z-[1] h-full min-h-[min(70dvh,560px)] w-full rounded-2xl border border-slate-200/70 bg-slate-900/[0.02] shadow-inner"
              />
            </div>
          </motion.div>
        ) : null}
      </main>
    </div>
  )
}
