import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface RecentProductsProps {
  products: ProductWithProfit[]
}

export function RecentProducts({ products }: RecentProductsProps) {
  return (
    <Card>
      <CardHeader title="Urun Performansi" subtitle="En yuksek etkili urunler" />
      {products.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Henuz urun yok</p>
      ) : (
        <div className="space-y-1">
          {products.map((product) => {
            const isProfitable = product.profit.netProfit >= 0
            return (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{(product.sales_price ?? 0).toLocaleString('tr-TR')} TL</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn('text-sm font-medium', isProfitable ? 'text-success-400' : 'text-danger-400')}>
                      {isProfitable ? '+' : ''}{product.profit.netProfit.toLocaleString('tr-TR')} TL
                    </p>
                    <p className="text-xs text-gray-500">%{product.profit.margin}</p>
                  </div>
                  <Badge variant={isProfitable ? 'success' : 'danger'}>
                    {isProfitable ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(product.profit.margin)}%
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
