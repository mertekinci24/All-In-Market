import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TableRowSkeleton } from '@/components/ui/Skeleton'
import { ArrowUp, ArrowDown, Minus, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface TrackingPageProps {
  products: ProductWithProfit[]
  loading: boolean
}

interface TrackingItem {
  id: string
  name: string
  your: number
  competitor: number
  diff: number
  action: 'MATCH' | 'HOLD'
}

export function TrackingPage({ products, loading }: TrackingPageProps) {
  if (loading) {
    return (
      <div className="animate-fade-in">
        <Header title="Fiyat Takibi" subtitle="Rakip fiyat karsilastirmasi ve aksiyon onerileri" />
        <div className="p-6">
          <Card className="overflow-hidden !p-0">
            <div className="border-b border-white/5 bg-surface-800/30 px-4 py-3">
              <div className="h-3 w-48 rounded bg-surface-700 animate-shimmer" />
            </div>
            <div className="divide-y divide-white/3">
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const trackingData: TrackingItem[] = products
    .filter((p) => p.competitor_price != null && p.competitor_price > 0)
    .map((p) => {
      const your = p.sales_price ?? 0
      const comp = p.competitor_price!
      const diff = your - comp
      return {
        id: p.id,
        name: p.name,
        your,
        competitor: comp,
        diff: Math.round(diff * 100) / 100,
        action: diff > 0 ? 'MATCH' as const : 'HOLD' as const,
      }
    })

  const alerts = trackingData.filter((t) => t.action === 'MATCH')
  const advantages = trackingData.filter((t) => t.diff < 0)

  return (
    <div className="animate-fade-in">
      <Header title="Fiyat Takibi" subtitle="Rakip fiyat karsilastirmasi ve aksiyon onerileri" />
      <div className="p-6 space-y-4">
        {trackingData.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-400">Rakip fiyat verisi bulunamadi</p>
            <p className="text-xs text-gray-600 mt-1">Urunlere rakip fiyati ekleyin veya extension ile veri senkronlayin</p>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden !p-0">
              <div className="border-b border-white/5 bg-surface-800/30 px-4 py-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rakip Karsilastirma Tablosu</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urun</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sizin Fiyat</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rakip Fiyat</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fark</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Oneri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {trackingData.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-white/2">
                      <td className="px-4 py-3 text-sm text-gray-200">{item.name}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-200">
                        {item.your.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">
                        {item.competitor.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-sm font-medium',
                          item.diff < 0 ? 'text-success-400' : item.diff > 0 ? 'text-danger-400' : 'text-gray-500'
                        )}>
                          {item.diff < 0 ? <ArrowDown className="h-3 w-3" /> : item.diff > 0 ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {Math.abs(item.diff).toLocaleString('tr-TR')} TL
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={item.action === 'MATCH' ? 'warning' : 'success'}>
                          {item.action}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="animate-slide-up stagger-1">
                <CardHeader title="Fiyat Uyarisi" subtitle="Rakip daha ucuz" />
                {alerts.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">Uyari yok</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-warning-500/5 border border-warning-500/10 px-3 py-2.5">
                        <span className="text-sm text-gray-300">{item.name}</span>
                        <span className="text-xs text-warning-400 font-medium">
                          Rakip {Math.abs(item.diff).toLocaleString('tr-TR')} TL daha ucuz
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="animate-slide-up stagger-2">
                <CardHeader title="Avantajli Urunler" subtitle="Fiyat avantajiniz olan urunler" />
                {advantages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500">Avantajli urun yok</p>
                ) : (
                  <div className="space-y-2">
                    {advantages.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-success-500/5 border border-success-500/10 px-3 py-2.5">
                        <span className="text-sm text-gray-300">{item.name}</span>
                        <span className="text-xs text-success-400 font-medium">
                          +{Math.abs(item.diff).toLocaleString('tr-TR')} TL avantaj
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
