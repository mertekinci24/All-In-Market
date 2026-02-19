import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface ProfitChartProps {
  products: ProductWithProfit[]
}

export function ProfitChart({ products }: ProfitChartProps) {
  const chartData = useMemo(() => {
    if (products.length === 0) return []
    const catMap = new Map<string, { revenue: number; profit: number }>()
    for (const p of products) {
      const cat = p.category || 'Diger'
      const existing = catMap.get(cat) ?? { revenue: 0, profit: 0 }
      catMap.set(cat, {
        revenue: existing.revenue + (p.sales_price ?? 0),
        profit: existing.profit + p.profit.netProfit,
      })
    }
    return Array.from(catMap.entries())
      .map(([name, data]) => ({ date: name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7)
  }, [products])

  return (
    <Card>
      <CardHeader title="Kar Dagilimi" subtitle="Kategoriye gore" />
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-gray-500">Grafik icin urun ekleyin</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={250} debounce={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00b26e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00b26e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
                formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString('tr-TR')} TL`]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#revenueGradient)"
                name="Ciro"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#00b26e"
                strokeWidth={1.5}
                fill="url(#profitGradient)"
                name="Net Kar"
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
