import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import type { WorstProduct } from '@/hooks/useAnalytics'
import { formatCurrency } from '@/lib/utils'

interface WorstProductsProps {
    data: WorstProduct[]
}

export function WorstProducts({ data }: WorstProductsProps) {
    const losers = data.filter((p) => p.netProfit < 0)

    if (losers.length === 0) {
        return (
            <Card>
                <CardHeader
                    title="En Çok Zarar Ettiren Ürünler"
                    action={
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-500/10 text-danger-400">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                    }
                />
                <div className="flex flex-col items-center py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/10 text-success-400 mb-2">
                        <span className="text-lg">🎉</span>
                    </div>
                    <p className="text-sm text-gray-400">Zararda ürün yok — tebrikler!</p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title="En Çok Zarar Ettiren 5 Ürün"
                subtitle="Negatif kâra göre sıralı"
                action={
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-500/10 text-danger-400">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                }
            />
            <div className="space-y-1.5">
                {losers.map((p, idx) => (
                    <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]"
                    >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-danger-500/10 text-danger-400 text-[11px] font-bold">
                            {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-500">
                                    Satış: {formatCurrency(p.salesPrice)}
                                </span>
                                {p.returnRate > 0 && (
                                    <span className="text-[11px] text-warning-400">
                                        İade: %{p.returnRate}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-danger-400 tabular-nums">
                                {formatCurrency(p.netProfit)}
                            </p>
                            <p className="text-[11px] text-gray-600 tabular-nums">%{p.margin}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
