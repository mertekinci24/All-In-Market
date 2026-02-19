import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface StatCardProps {
  label: string
  value: string
  change?: number
  icon: LucideIcon
  iconColor?: string
  tooltip?: string
}

export function StatCard({ label, value, change, icon: Icon, iconColor = 'text-brand-400', tooltip }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
          </p>
          <p className="text-2xl font-semibold text-gray-100 tracking-tight tabular-nums">{value}</p>
          {change !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-success-400' : 'text-danger-400')}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </div>
          )}
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 transition-colors duration-200', iconColor)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  )
}
