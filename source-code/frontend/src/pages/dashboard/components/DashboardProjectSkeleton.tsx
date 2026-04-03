import { motion } from 'framer-motion'

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export function DashboardProjectSkeleton({ count = 6 }: { count?: number }) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          variants={item}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-glass border border-white/50 bg-white/40 shadow-soft backdrop-blur-sm"
        >
          <div className="h-36 animate-pulse bg-gradient-to-br from-sky-light/50 via-white/60 to-bg-alice-blue" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/5 animate-pulse rounded-lg bg-slate-200/80" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200/50" />
            <div className="flex gap-2 pt-2">
              <div className="h-9 flex-1 animate-pulse rounded-xl bg-sky-light/40" />
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-200/60" />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
