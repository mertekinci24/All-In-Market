import { Card, CardHeader } from '@/components/ui/Card'
import type { CategoryRollup } from '@/hooks/useAnalytics'
import { formatCurrency } from '@/lib/utils'

interface CategoryHeatmapProps {
    data: CategoryRollup[]
}

/* Hücre rengi: negatif → kırmızı, düşük → sarı, yüksek → yeşil */
function marginColor(margin: number): string {
    if (margin < 0) return 'bg-danger-500/20 text-danger-400'
    if (margin < 10) return 'bg-warning-500/20 text-warning-400'
    if (margin < 20) return 'bg-amber-500/15 text-amber-400'
    return 'bg-success-500/20 text-success-400'
}

function returnColor(rate: number): string {
    if (rate === 0) return 'text-gray-500'
    if (rate <= 3) return 'bg-success-500/10 text-success-400'
    if (rate <= 8) return 'bg-warning-500/15 text-warning-400'
    return 'bg-danger-500/15 text-danger-400'
}

export function CategoryHeatmap({ data }: CategoryHeatmapProps) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader title="Kategori Isı Haritası" subtitle="Kategori bazlı kârlılık analizi" />
                <p className="py-8 text-center text-sm text-gray-500">Kategori verisi bulunamadı</p>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader title="Kategori Isı Haritası" subtitle="Kategori bazlı kârlılık analizi" />
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="py-2 px-3 text-left font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                            <th className="py-2 px-3 text-right font-medium text-gray-500 uppercase tracking-wider">Ciro</th>
                            <th className="py-2 px-3 text-right font-medium text-gray-500 uppercase tracking-wider">Kâr</th>
                            <th className="py-2 px-3 text-center font-medium text-gray-500 uppercase tracking-wider">Marj</th>
                            <th className="py-2 px-3 text-center font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="py-2 px-3 text-center font-medium text-gray-500 uppercase tracking-wider">İade%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((cat) => (
                            <tr
                                key={cat.category}
                                className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                            >
                                <td className="py-2.5 px-3 font-medium text-gray-300">{cat.category}</td>
                                <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">
                                    {formatCurrency(cat.revenue)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-medium tabular-nums ${cat.profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                                    {cat.profit >= 0 ? '+' : ''}{formatCurrency(cat.profit)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ${marginColor(cat.margin)}`}>
                                        %{cat.margin}
                                    </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-gray-400">{cat.productCount}</td>
                                <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums ${returnColor(cat.avgReturnRate)}`}>
                                        %{cat.avgReturnRate}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
