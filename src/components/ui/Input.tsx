import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-lg border bg-surface-800/50 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 focus:bg-surface-800/70',
          error ? 'border-danger-500/50 focus:ring-danger-500/30 focus:border-danger-500/50' : 'border-white/5 hover:border-white/10',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger-400 animate-fade-in">{error}</p>}
    </div>
  )
}
