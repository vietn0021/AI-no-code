import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const pastelButtonVariants = cva(
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/35 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-sky-light text-sky-dark hover:shadow-soft-hover',
        secondary: 'bg-sky-dark text-white hover:brightness-95 hover:shadow-soft-hover',
        ghost: 'bg-transparent text-sky-dark hover:bg-white/20 hover:shadow-soft',
        danger:
          'border border-red-200/90 bg-red-100 text-red-800 hover:bg-red-200/90 hover:shadow-soft',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type PastelButtonProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragStart' | 'onDragEnd'
  > &
  VariantProps<typeof pastelButtonVariants> & {
    loading?: boolean
  }

export function PastelButton({
  className,
  variant,
  size,
  loading = false,
  children,
  disabled,
  ...props
}: PastelButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <button
        className={cn(pastelButtonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    </motion.div>
  )
}
