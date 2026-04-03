import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { HTMLAttributes, PropsWithChildren } from 'react'

type GlassCardProps = PropsWithChildren<
  Omit<
    HTMLAttributes<HTMLDivElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd'
  > & {
    interactive?: boolean
  }
>

export function GlassCard({
  interactive = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  if (interactive) {
    return (
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div
          className={cn(
            'glass-surface rounded-glass border border-white/30 p-4 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft-hover md:p-6',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </motion.div>
    )
  }

  return (
    <div
      className={cn(
        'glass-surface rounded-glass border border-white/30 p-4 shadow-soft md:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
