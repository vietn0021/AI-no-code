import { motion } from 'framer-motion'
import { Gamepad2, Sparkles } from 'lucide-react'
import { PastelButton } from '../../../components/shared'

type DashboardEmptyStateProps = {
  onCreateClick: () => void
}

export function DashboardEmptyState({ onCreateClick }: DashboardEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-lg overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/35 px-8 py-14 text-center shadow-soft backdrop-blur-md"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-light/50 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-sky-dark/20 blur-2xl"
        aria-hidden
      />

      <motion.div
        className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center"
        initial={{ rotate: -6, y: 8 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      >
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sky-light via-white to-bg-alice-blue shadow-soft ring-2 ring-white/70" />
        <div className="relative flex flex-col items-center gap-1">
          <Gamepad2 className="h-14 w-14 text-sky-dark/75" strokeWidth={1.25} />
          <Sparkles className="h-5 w-5 text-sky-dark/50" />
        </div>
      </motion.div>

      <h2 className="font-display text-xl font-bold text-slate-800 md:text-2xl">Chưa có game nào</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Tạo game đầu tiên của bạn và thiết kế scene bằng AI — mọi thứ bắt đầu từ đây.
      </p>
      <PastelButton
        variant="secondary"
        className="mt-10 px-8 py-2.5 text-base font-semibold shadow-soft"
        type="button"
        onClick={onCreateClick}
      >
        Tạo game đầu tiên
      </PastelButton>
    </motion.div>
  )
}
