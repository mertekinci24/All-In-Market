import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
  CartesianGrid, Legend,
} from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { TrendingUp, Percent, Package, DollarSign } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatCurrency } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface AnalyticsPageProps {
  products: ProductWithProfit[]
  loading: boolean
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
}

const CATEGORY_COLORS = ['#00b26e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export function AnalyticsPage({ products, loading }: AnalyticsPageProps) {
  const stats = useDashboardStats(products)

  const profitDistribution = useMemo(() => [
    { name: 'Karli', value: stats.profitableCount, color: '#10b981' },
    { name: 'Zararda', value: stats.lossCount, color: '#ef4444' },
  ].filter((d) => d.value > 0), [stats.profitableCount, stats.lossCount])

  const marginScatter = useMemo(() =>
    products.map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
      margin: p.profit.margin,
      roi: p.profit.roi,
      revenue: p.sales_price ?? 0,
    })),
  [products])

  const costBreakdown = useMemo(() => {
    if (products.length === 0) return []
    const totals = { buy: 0, vat: 0, commission: 0, shipping: 0, extra: 0, ad: 0 }
    for (const p of products) {
      totals.buy += p.profit.buyPrice
      totals.vat += p.profit.vat
      totals.commission += p.profit.commission
      totals.shipping += p.profit.shippingCost
      totals.extra += p.profit.extraCost
      totals.ad += p.profit.adCost
    }
    return [
      { name: 'Alis Maliyeti', value: Math.round(totals.buy), color: '#3b82f6' },
      { name: 'KDV', value: Math.round(totals.vat), color: '#f59e0b' },
      { name: 'Komisyon', value: Math.round(totals.commission), color: '#ef4444' },
      { name: 'Kargo', value: Math.round(totals.shipping), color: '#06b6d4' },
      { name: 'Ek Gider', value: Math.round(totals.extra), color: '#8b5cf6' },
      { name: 'Reklam', value: Math.round(totals.ad), color: '#ec4899' },
    ].filter((c) => c.value > 0)
  }, [products])

  const categoryRevenue = useMemo(() => {
    const catMap = new Map<string, { revenue: number; profit: number; count: number }>()
    for (const p of products) {
      const cat = p.category || 'Diger'
      const existing = catMap.get(cat) ?? { revenue: 0, profit: 0, count: 0 }
      catMap.set(cat, {
        revenue: existing.revenue + (p.sales_price ?? 0),
        profit: existing.profit + p.profit.netProfit,
        count: existing.count + 1,
      })
    }
    return Array.from(catMap.entries())
      .map(([name, d], i) => ({ name, ...d, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }, [products])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="Analiz" subtitle="Detayli karlilik ve performans analizi" />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ort. Kar Marji" value={`%${stats.avgMargin}`} icon={Percent} iconColor="text-brand-400" />
          <StatCard label="Ort. ROI" value={`%${stats.avgRoi}`} icon={TrendingUp} iconColor="text-blue-400" />
          <StatCard label="Toplam SKU" value={String(stats.activeCount)} icon={Package} iconColor="text-warning-400" />
          <StatCard label="Toplam Ciro" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} iconColor="text-success-400" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Kategori Bazli Performans" subtitle="Ciro ve kar karsilastirmasi" />
              {categoryRevenue.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Kategori verisi bulunamadi</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRevenue} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString('tr-TR')} TL`]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }}
                      />
                      <Bar dataKey="revenue" name="Ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive animationDuration={800} />
                      <Bar dataKey="profit" name="Net Kar" fill="#00b26e" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Karlilik Dagilimi" subtitle="Urun bazli durum" />
            {profitDistribution.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Henuz urun yok</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profitDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                        isAnimationActive
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {profitDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-6 mt-2">
                  {profitDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-400">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Marj vs ROI Dagilimi" subtitle="Urun bazli scatter analizi" />
            {marginScatter.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Henuz urun yok</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="margin"
                      name="Marj"
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="roi"
                      name="ROI"
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <ZAxis dataKey="revenue" range={[40, 200]} name="Ciro" />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        if (name === 'Ciro') return [`${(value ?? 0).toLocaleString('tr-TR')} TL`, name]
                        return [`%${value ?? 0}`, name ?? '']
                      }}
                    />
                    <Scatter data={marginScatter} fill="#00b26e" fillOpacity={0.7} isAnimationActive animationDuration={800} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Maliyet Dagilimi" subtitle="Toplam gider kalemleri" />
            {costBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Maliyet verisi yok</p>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                        isAnimationActive
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {costBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString('tr-TR')} TL`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                  {costBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-gray-400">
                        {item.name}: {item.value.toLocaleString('tr-TR')} TL
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
