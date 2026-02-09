import { DollarSign, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProfitChart } from '@/components/dashboard/ProfitChart'
import { RecentProducts } from '@/components/dashboard/RecentProducts'
import { CurrencyTicker } from '@/components/dashboard/CurrencyTicker'
import { StatCardSkeleton, ChartSkeleton, ProductListSkeleton } from '@/components/ui/Skeleton'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatCurrency } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface CurrencyRates {
  USD: number
  EUR: number
  GBP: number
  CNY: number
  timestamp: string
  source: string
}

interface DashboardPageProps {
  products: ProductWithProfit[]
  loading: boolean
  currencyRates: CurrencyRates | null
}

export function DashboardPage({ products, loading, currencyRates }: DashboardPageProps) {
  const stats = useDashboardStats(products)

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Header title="Dashboard" subtitle="Genel bakis ve ozet istatistikler" />
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`animate-slide-up stagger-${i}`}>
                <StatCardSkeleton />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3 animate-slide-up stagger-5">
              <ChartSkeleton />
            </div>
            <div className="lg:col-span-2 animate-slide-up stagger-6">
              <ProductListSkeleton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="Dashboard" subtitle="Genel bakis ve ozet istatistikler" />
      <div className="space-y-5 p-6">
        {currencyRates && (
          <div className="animate-slide-up">
            <CurrencyTicker rates={currencyRates} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="animate-slide-up stagger-1">
            <StatCard
              label="Toplam Ciro"
              value={formatCurrency(stats.totalRevenue)}
              icon={DollarSign}
              iconColor="text-blue-400"
            />
          </div>
          <div className="animate-slide-up stagger-2">
            <StatCard
              label="Net Kar"
              value={formatCurrency(stats.totalProfit)}
              icon={TrendingUp}
              iconColor="text-success-400"
            />
          </div>
          <div className="animate-slide-up stagger-3">
            <StatCard
              label="Aktif Urun"
              value={String(stats.activeCount)}
              icon={Package}
              iconColor="text-brand-400"
            />
          </div>
          <div className="animate-slide-up stagger-4">
            <StatCard
              label="Zarar Urunler"
              value={String(stats.lossCount)}
              icon={AlertTriangle}
              iconColor="text-danger-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3 animate-slide-up stagger-5">
            <ProfitChart products={products} />
          </div>
          <div className="lg:col-span-2 animate-slide-up stagger-6">
            <RecentProducts products={stats.topProducts} />
          </div>
        </div>
      </div>
    </div>
  )
}
