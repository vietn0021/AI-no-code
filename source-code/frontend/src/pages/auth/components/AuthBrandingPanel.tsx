import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

type FloatEntity = {
  id: string
  color: string
  w: number
  h: number
  left: string
  top: string
  shape: 'circle' | 'square' | 'triangle'
  duration: number
  delay: number
  driftX: number[]
  driftY: number[]
}

const ENTITIES: FloatEntity[] = [
  {
    id: 'a',
    color: '#9575CD',
    w: 44,
    h: 44,
    left: '12%',
    top: '18%',
    shape: 'circle',
    duration: 5.5,
    delay: 0,
    driftX: [0, 8, -4, 0],
    driftY: [0, -14, 6, 0],
  },
  {
    id: 'b',
    color: '#87CEEB',
    w: 38,
    h: 38,
    left: '72%',
    top: '22%',
    shape: 'square',
    duration: 6.2,
    delay: 0.4,
    driftX: [0, -10, 6, 0],
    driftY: [0, 10, -8, 0],
  },
  {
    id: 'c',
    color: '#FDE047',
    w: 32,
    h: 32,
    left: '48%',
    top: '12%',
    shape: 'triangle',
    duration: 4.8,
    delay: 0.2,
    driftX: [0, 6, -8, 0],
    driftY: [0, 12, -6, 0],
  },
  {
    id: 'd',
    color: '#86EFAC',
    w: 36,
    h: 36,
    left: '20%',
    top: '62%',
    shape: 'square',
    duration: 7,
    delay: 0.6,
    driftX: [0, 12, -6, 0],
    driftY: [0, -10, 8, 0],
  },
  {
    id: 'e',
    color: '#FCA5A5',
    w: 40,
    h: 40,
    left: '78%',
    top: '58%',
    shape: 'circle',
    duration: 5.2,
    delay: 0.15,
    driftX: [0, -8, 10, 0],
    driftY: [0, 8, -12, 0],
  },
  {
    id: 'f',
    color: '#C4B5FD',
    w: 28,
    h: 28,
    left: '52%',
    top: '72%',
    shape: 'triangle',
    duration: 6.5,
    delay: 0.5,
    driftX: [0, -6, 8, 0],
    driftY: [0, -14, 4, 0],
  },
]

function EntityShape({ e }: { e: FloatEntity }) {
  const base = 'shadow-md ring-2 ring-white/50'
  if (e.shape === 'circle') {
    return (
      <div
        className={base}
        style={{
          width: e.w,
          height: e.h,
          borderRadius: '9999px',
          backgroundColor: e.color,
        }}
      />
    )
  }
  if (e.shape === 'triangle') {
    return (
      <div
        className={base}
        style={{
          width: e.w,
          height: e.h,
          backgroundColor: e.color,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
    )
  }
  return (
    <div
      className={`${base} rounded-xl`}
      style={{
        width: e.w,
        height: e.h,
        backgroundColor: e.color,
      }}
    />
  )
}

export function AuthBrandingPanel() {
  return (
    <div className="relative flex min-h-[220px] flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-sky-light/90 via-[#d9efff] to-bg-alice-blue px-8 py-12 lg:min-h-screen lg:w-full lg:max-w-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9) 0%, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(189,224,254,0.6) 0%, transparent 40%)`,
        }}
      />

      {ENTITIES.map((e) => (
        <motion.div
          key={e.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: e.left, top: e.top }}
          animate={{
            x: e.driftX,
            y: e.driftY,
            rotate: [0, e.shape === 'square' ? 12 : 0, -6, 0],
          }}
          transition={{
            duration: e.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: e.delay,
          }}
        >
          <EntityShape e={e} />
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-sm text-center lg:text-left">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="mb-6 inline-flex rounded-2xl border border-white/60 bg-white/45 p-4 shadow-soft backdrop-blur-md lg:mb-8"
        >
          <Sparkles className="h-10 w-10 text-sky-dark md:h-12 md:w-12" strokeWidth={1.75} />
        </motion.div>
        <motion.h1
          className="font-display text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl lg:text-[2.65rem] lg:leading-[1.1]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
        >
          AI Game Studio
        </motion.h1>
        <motion.p
          className="mt-4 text-base font-medium leading-relaxed text-slate-600 md:text-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
        >
          Tạo game không cần code — thiết kế scene, kéo asset, nhờ AI gợi ý trong vài phút.
        </motion.p>
      </div>
    </div>
  )
}
