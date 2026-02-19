import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card } from '@/components/ui/Card'
import { estimateVariantSales } from '@/lib/review-analysis'
import type { VariantReviewData } from '@/lib/review-analysis'
import { useMemo } from 'react'

interface VariantAnalysisCardProps {
    variants: VariantReviewData[]
    totalMonthlySales: number
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1']

export function VariantAnalysisCard({ variants, totalMonthlySales }: VariantAnalysisCardProps) {
    const data = useMemo(() => estimateVariantSales(variants, totalMonthlySales), [variants, totalMonthlySales])

    return (
        <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Varyant Bazli Satis Tahmini</h3>
                <span className="text-xs text-gray-500">Yorum dagilimina gore</span>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="estimatedSales"
                            nameKey="variantName"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            formatter={(value: any) => [`${value} Adet`, 'Tahmini Satis']}
                        />
                        <Legend verticalAlign="bottom" height={36} formatter={(value: any) => <span className="text-gray-400 text-xs ml-1">{value}</span>} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-4">
                {data.slice(0, 5).map((item, index) => (
                    <div key={item.variantName} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-gray-300 truncate max-w-[150px]">{item.variantName}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-medium text-white">{item.estimatedSales}</span>
                            <span className="text-xs text-gray-500 ml-1">({item.reviewShare}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
