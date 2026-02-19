import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ZAxis, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { CategoryHeatmap } from '@/components/analytics/CategoryHeatmap'
import { WorstProducts } from '@/components/analytics/WorstProducts'
import { CampaignROIChart } from '@/components/analytics/CampaignROIChart'
import { CampaignImpactCard } from '@/components/analytics/CampaignImpactCard'
import { AiAdvisorPanel } from '@/components/analytics/AiAdvisorPanel'
import { ExportButton } from '@/components/ui/ExportButton'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useExport } from '@/hooks/useExport'
import { useAiAdvisor } from '@/hooks/useAiAdvisor'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Percent, ShoppingCart, Zap } from 'lucide-react'
import type { ProductWithProfit } from '@/hooks/useProducts'
import type { OrderWithItems } from '@/hooks/useOrders'
import type { CommissionSchedule } from '@/lib/financial-engine'

interface AnalyticsPageProps {
  products: ProductWithProfit[]
  loading: boolean
  orders: OrderWithItems[]
  commissionSchedules: CommissionSchedule[]
  storeName: string
  marketplace: string
}

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
}

const CATEGORY_COLORS = ['#00b26e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

export function AnalyticsPage({ products, loading, orders, commissionSchedules, storeName, marketplace }: AnalyticsPageProps) {
  const stats = useDashboardStats(products)
  const analytics = useAnalytics(products, orders, commissionSchedules)
  const { exportReport, exporting, error: exportError } = useExport()
  const advisor = useAiAdvisor()

  /* Margin vs Return Rate scatter */
  const marginReturnScatter = useMemo(() =>
    products
      .filter((p) => (p.return_rate ?? 0) > 0 || p.profit.margin !== 0)
      .map((p) => ({
        name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
        margin: p.profit.margin,
        returnRate: p.return_rate ?? 0,
        revenue: p.sales_price ?? 0,
      })),
    [products])

  /* Cost breakdown for pie (with Phase 6 costs) */
  const costBreakdown = useMemo(() => {
    if (products.length === 0) return []
    const totals = { buy: 0, vat: 0, commission: 0, shipping: 0, extra: 0, ad: 0, packaging: 0, returnCost: 0, serviceFee: 0 }
    for (const p of products) {
      totals.buy += p.profit.buyPrice
      totals.vat += p.profit.vat
      totals.commission += p.profit.commission
      totals.shipping += p.profit.shippingCost
      totals.extra += p.profit.extraCost
      totals.ad += p.profit.adCost
      totals.packaging += p.profit.packagingCost ?? 0
      totals.returnCost += p.profit.returnCost ?? 0
      totals.serviceFee += p.profit.serviceFee ?? 0
    }
    return [
      { name: 'Alış Maliyeti', value: Math.round(totals.buy), color: '#3b82f6' },
      { name: 'KDV', value: Math.round(totals.vat), color: '#f59e0b' },
      { name: 'Komisyon', value: Math.round(totals.commission), color: '#ef4444' },
      { name: 'Kargo', value: Math.round(totals.shipping), color: '#06b6d4' },
      { name: 'Ek Gider', value: Math.round(totals.extra), color: '#8b5cf6' },
      { name: 'Reklam', value: Math.round(totals.ad), color: '#ec4899' },
      { name: 'Paketleme', value: Math.round(totals.packaging), color: '#f97316' },
      { name: 'İade', value: Math.round(totals.returnCost), color: '#dc2626' },
      { name: 'Hizmet', value: Math.round(totals.serviceFee), color: '#7c3aed' },
    ].filter((c) => c.value > 0)
  }, [products])

  /* Category bar chart */
  const categoryRevenue = useMemo(() =>
    analytics.categoryRollups
      .slice(0, 8)
      .map((c, i) => ({ name: c.category, revenue: c.revenue, profit: c.profit, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
    [analytics.categoryRollups])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-surface-950/80 px-6 backdrop-blur-xl">
        <div>
          <h1 className="text-sm font-semibold text-gray-100">Analiz</h1>
          <p className="text-xs text-gray-500">Detaylı kârlılık, kampanya ve iade analizi</p>
        </div>
        <ExportButton
          onExport={(format) => exportReport(format, products, analytics, storeName, marketplace)}
          exporting={exporting}
          error={exportError}
        />
      </div>
      <div className="space-y-5 p-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ort. Kar Marjı" value={`%${stats.avgMargin}`} icon={Percent} iconColor="text-brand-400" tooltip="Tüm ürünlerin ortalama net kâr marjı. Satış fiyatınızın yüzde kaçı net kâr olarak kalmaktadır." />
          <StatCard label="Ort. ROI" value={`%${stats.avgRoi}`} icon={TrendingUp} iconColor="text-blue-400" tooltip="Yatırım Getiri Oranı: Her 1 TL alış maliyetine karşılık yüzde kaç net kazanç sağlanıyor." />
          <StatCard
            label="Sipariş Geliri"
            value={formatCurrency(analytics.totalOrderRevenue)}
            icon={ShoppingCart}
            iconColor="text-warning-400"
            tooltip="Tüm siparişlerin toplam brüt geliri (KDV dahil satış fiyatları toplamı)."
          />
          <StatCard
            label="Kampanya Oranı"
            value={`%${analytics.campaignOrderRatio}`}
            icon={Zap}
            iconColor="text-success-400"
            tooltip="Toplam siparişlerin yüzde kaçı aktif kampanya döneminde gerçekleşti."
          />
        </div>

        {/* Row 1: Category bar + Campaign ROI */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader title="Kategori Bazlı Performans" subtitle="Ciro ve kâr karşılaştırması" />
              {categoryRevenue.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Kategori verisi bulunamadı</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRevenue} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => [`${(value ?? 0).toLocaleString('tr-TR')} TL`]} />
                      <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }} />
                      <Bar dataKey="revenue" name="Ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive animationDuration={800} />
                      <Bar dataKey="profit" name="Net Kâr" fill="#00b26e" radius={[4, 4, 0, 0]} barSize={18} isAnimationActive animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
          <div className="lg:col-span-2">
            <WorstProducts data={analytics.worstProducts} />
          </div>
        </div>

        {/* Row 2: Campaign ROI Chart (full width) */}
        <CampaignROIChart timeSeries={analytics.timeSeries} campaigns={analytics.campaignImpacts} />

        {/* Row 3: Heatmap + Campaign Impact */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CategoryHeatmap data={analytics.categoryRollups} />
          </div>
          <div className="lg:col-span-2">
            <CampaignImpactCard data={analytics.campaignImpacts} campaignOrderRatio={analytics.campaignOrderRatio} />
          </div>
        </div>

        {/* Row 4: AI Advisor (full width) */}
        <AiAdvisorPanel analytics={analytics} marketplace={marketplace} advisor={advisor} />

        {/* Row 5: Margin vs Return Rate scatter + Cost Breakdown */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Marj vs İade Oranı" subtitle="Ürün bazlı scatter analizi" />
            {marginReturnScatter.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Henüz veri yok</p>
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
                      dataKey="returnRate"
                      name="İade Oranı"
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
                    <Scatter data={marginReturnScatter} fill="#f59e0b" fillOpacity={0.7} isAnimationActive animationDuration={800} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Maliyet Dağılımı" subtitle="Toplam gider kalemleri" />
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
