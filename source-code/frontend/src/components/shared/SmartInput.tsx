import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type SmartInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
}

export function SmartInput({ className, error, ...props }: SmartInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPasswordField = props.type === 'password'
  const resolvedType = isPasswordField
    ? isPasswordVisible
      ? 'text'
      : 'password'
    : props.type

  return (
    <div className="w-full space-y-1.5">
      <div className="relative">
        <input
          className={cn(
            'w-full rounded-xl border border-white/40 bg-white/60 px-4 py-2.5 text-slate-700 shadow-sm placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/35',
            isPasswordField && 'pr-10',
            error && 'border-red-300 focus-visible:ring-red-300/60',
            className,
          )}
          {...props}
          type={resolvedType}
        />

        {isPasswordField ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-sky-dark"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  )
}
