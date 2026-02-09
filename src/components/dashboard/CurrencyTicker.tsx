import { RefreshCw } from 'lucide-react'

interface CurrencyRates {
  USD: number
  EUR: number
  GBP: number
  CNY: number
  timestamp: string
  source: string
}

interface CurrencyTickerProps {
  rates: CurrencyRates
}

const CURRENCIES = [
  { key: 'USD' as const, label: 'USD/TRY', flag: '$' },
  { key: 'EUR' as const, label: 'EUR/TRY', flag: '\u20AC' },
  { key: 'GBP' as const, label: 'GBP/TRY', flag: '\u00A3' },
  { key: 'CNY' as const, label: 'CNY/TRY', flag: '\u00A5' },
]

export function CurrencyTicker({ rates }: CurrencyTickerProps) {
  const time = new Date(rates.timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="glass-card flex items-center gap-1 overflow-x-auto px-4 py-2.5 !rounded-lg">
      <div className="flex items-center gap-1.5 mr-3 shrink-0">
        <RefreshCw className="h-3 w-3 text-gray-500" />
        <span className="text-[11px] text-gray-500">{time}</span>
      </div>
      <div className="flex items-center gap-5">
        {CURRENCIES.map((c) => {
          const value = rates[c.key]
          if (!value) return null
          return (
            <div key={c.key} className="flex items-center gap-2 shrink-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-xs font-medium text-gray-300">
                {c.flag}
              </span>
              <div>
                <p className="text-[11px] text-gray-500 leading-none">{c.label}</p>
                <p className="text-sm font-medium text-gray-200 tabular-nums leading-tight">
                  {value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <span className="ml-auto text-[10px] text-gray-600 shrink-0">{rates.source}</span>
    </div>
  )
}
