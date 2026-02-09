import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'neutral'
  className?: string
}

const badgeVariants = {
  success: 'bg-success-500/10 text-success-400 border-success-500/20',
  danger: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  neutral: 'bg-white/5 text-gray-400 border-white/10',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
