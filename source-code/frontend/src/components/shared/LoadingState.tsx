import { cn } from '../../lib/utils'

type LoadingStateProps = {
  className?: string
  label?: string
}

export function LoadingState({ className, label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl bg-sky-light/45 p-3', className)}>
      <span className="h-3 w-3 animate-pulse rounded-full bg-sky-dark/60" />
      <span className="text-sm text-sky-dark/80">{label}</span>
    </div>
  )
}
