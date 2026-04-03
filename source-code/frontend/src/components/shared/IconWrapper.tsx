import type { PropsWithChildren } from 'react'
import { cn } from '../../lib/utils'

type IconWrapperProps = PropsWithChildren<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}>

const sizeMap = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-11 w-11 text-lg',
} as const

export function IconWrapper({ size = 'md', className, children }: IconWrapperProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-sky-light/70 text-sky-dark ring-1 ring-white/40',
        sizeMap[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
