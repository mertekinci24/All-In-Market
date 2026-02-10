import { useState, useMemo } from 'react'
import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X,
  ShoppingCart, Eye, ChevronDown,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { OrderModal } from '@/components/orders/OrderModal'
import { OrderDeleteConfirm } from '@/components/orders/OrderDeleteConfirm'
import { cn } from '@/lib/utils'
import type { OrderWithItems } from '@/hooks/useOrders'
import type { OrderFormData, OrderLineItem } from '@/components/orders/OrderModal'
import type { ProductWithProfit } from '@/hooks/useProducts'
import type { ShippingRate } from '@/lib/financial-engine'
import type { Database } from '@/types/database'

type OrderInsert = Omit<Database['public']['Tables']['orders']['Insert'], 'store_id'>
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderItemInsert = Omit<Database['public']['Tables']['order_items']['Insert'], 'order_id'>

interface OrdersPageProps {
  orders: OrderWithItems[]
  loading: boolean
  products: ProductWithProfit[]
  shippingRates: ShippingRate[]
  onAdd: (order: OrderInsert, items: OrderItemInsert[]) => Promise<unknown>
  onUpdate: (id: string, order: OrderUpdate, items?: OrderItemInsert[]) => Promise<unknown>
  onDelete: (id: string) => Promise<boolean>
}

type StatusTab = 'all' | 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'Tumu' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'shipped', label: 'Kargoda' },
  { value: 'delivered', label: 'Teslim' },
  { value: 'returned', label: 'Iade' },
  { value: 'cancelled', label: 'Iptal' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  returned: 'Iade',
  cancelled: 'Iptal',
}

const STATUS_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  shipped: 'neutral',
  delivered: 'success',
  returned: 'danger',
  cancelled: 'danger',
}

const PAGE_SIZE = 15

export function OrdersPage({ orders, loading, products, shippingRates, onAdd, onUpdate, onDelete }: OrdersPageProps) {
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOrder, setEditOrder] = useState<OrderWithItems | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrderWithItems | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = [...orders]

    if (statusTab !== 'all') {
      result = result.filter((o) => o.status === statusTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.marketplace_order_id.toLowerCase().includes(q) ||
          o.campaign_name.toLowerCase().includes(q) ||
          o.items.some((item) => item.product_name.toLowerCase().includes(q))
      )
    }

    return result
  }, [orders, statusTab, search])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1
    })
    return counts
  }, [orders])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageOrders = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const handleSave = async (data: OrderFormData, items: OrderLineItem[]) => {
    const orderPayload: OrderInsert = {
      order_number: data.order_number,
      marketplace_order_id: data.marketplace_order_id,
      order_date: data.order_date ? new Date(data.order_date).toISOString() : new Date().toISOString(),
      campaign_name: data.campaign_name,
      campaign_seller_share: data.campaign_seller_share,
      campaign_marketplace_share: data.campaign_marketplace_share,
      status: data.status,
      notes: data.notes,
      total_amount: items.reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
      total_shipping: items.reduce((sum, l) => sum + l.shipping_share, 0),
      total_commission: items.reduce((sum, l) => sum + (l.unit_price * l.quantity * l.commission_rate_at_sale), 0),
      total_profit: items.reduce((sum, l) => sum + l.net_profit, 0),
    }

    const itemPayload: OrderItemInsert[] = items.map((l) => ({
      product_id: l.product_id || null,
      product_name: l.product_name,
      quantity: l.quantity,
      unit_price: l.unit_price,
      buy_price_at_sale: l.buy_price_at_sale,
      commission_rate_at_sale: l.commission_rate_at_sale,
      vat_rate_at_sale: l.vat_rate_at_sale,
      shipping_share: l.shipping_share,
      extra_cost: l.extra_cost,
      ad_cost: l.ad_cost,
      net_profit: l.net_profit,
    }))

    if (editOrder) {
      await onUpdate(editOrder.id, orderPayload, itemPayload)
    } else {
      await onAdd(orderPayload, itemPayload)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await onDelete(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="Siparisler" subtitle="Siparis yonetimi ve kar takibi" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Siparis no, urun veya kampanya ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="h-9 w-80 rounded-lg border border-white/5 bg-surface-800/50 pl-9 pr-8 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={() => { setEditOrder(null); setModalOpen(true) }}>
            <Plus className="h-3.5 w-3.5" />
            Siparis Ekle
          </Button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusTab(tab.value); setPage(0) }}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap',
                statusTab === tab.value
                  ? 'bg-brand-500/10 text-brand-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              )}
            >
              {tab.label}
              {(statusCounts[tab.value] ?? 0) > 0 && (
                <span className={cn(
                  'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]',
                  statusTab === tab.value ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-gray-500'
                )}>
                  {statusCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-400">
              {orders.length === 0 ? 'Henuz siparis eklenmedi' : 'Filtreyle eslesen siparis bulunamadi'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {orders.length === 0 ? 'Ilk siparisini ekleyerek basla' : 'Farkli filtre kriterleri deneyin'}
            </p>
            {orders.length === 0 && (
              <Button size="sm" className="mt-4" onClick={() => { setEditOrder(null); setModalOpen(true) }}>
                <Plus className="h-3.5 w-3.5" />
                Ilk Siparisini Ekle
              </Button>
            )}
          </Card>
        ) : (
          <Card className="overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5 bg-surface-800/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siparis</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Kalem</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kargo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Kar</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {pageOrders.map((order) => {
                    const isProfitable = order.total_profit >= 0
                    const isExpanded = expandedRow === order.id
                    return (
                      <OrderTableRow
                        key={order.id}
                        order={order}
                        isProfitable={isProfitable}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedRow(isExpanded ? null : order.id)}
                        onEdit={() => { setEditOrder(order); setModalOpen(true) }}
                        onDelete={() => setDeleteTarget(order)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} siparis
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageIdx = i
                    if (totalPages > 5) {
                      const start = Math.max(0, Math.min(safePage - 2, totalPages - 5))
                      pageIdx = start + i
                    }
                    return (
                      <button
                        key={pageIdx}
                        onClick={() => setPage(pageIdx)}
                        className={cn(
                          'flex h-7 min-w-[28px] items-center justify-center rounded-lg text-xs font-medium transition-colors',
                          pageIdx === safePage
                            ? 'bg-brand-500/20 text-brand-400'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        )}
                      >
                        {pageIdx + 1}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                    disabled={safePage >= totalPages - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <OrderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditOrder(null) }}
        onSave={handleSave}
        order={editOrder}
        products={products}
        shippingRates={shippingRates}
      />

      <OrderDeleteConfirm
        open={!!deleteTarget}
        orderNumber={deleteTarget?.order_number ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function OrderTableRow({
  order,
  isProfitable,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  order: OrderWithItems
  isProfitable: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-'

  return (
    <>
      <tr className="transition-colors hover:bg-white/[0.02] group">
        <td className="px-4 py-3">
          <button
            onClick={onToggleExpand}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-400"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-200">{order.order_number || '-'}</p>
          {order.campaign_name && (
            <p className="text-[11px] text-gray-600 mt-0.5">{order.campaign_name}</p>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-400">{orderDate}</td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-gray-400">{order.items.length}</span>
        </td>
        <td className="px-4 py-3 text-right text-sm text-gray-200 font-medium tabular-nums">
          {order.total_amount.toLocaleString('tr-TR')} TL
        </td>
        <td className="px-4 py-3 text-right text-sm text-gray-400 tabular-nums">
          {order.total_shipping.toLocaleString('tr-TR')} TL
        </td>
        <td className={cn('px-4 py-3 text-right text-sm font-medium tabular-nums', isProfitable ? 'text-success-400' : 'text-danger-400')}>
          {isProfitable ? '+' : ''}{order.total_profit.toLocaleString('tr-TR')} TL
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant={STATUS_VARIANTS[order.status] ?? 'neutral'}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleExpand}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
              title="Detay"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-danger-500/10 hover:text-danger-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && order.items.length > 0 && (
        <tr>
          <td colSpan={9} className="px-4 pb-3">
            <div className="ml-8 rounded-lg border border-white/5 bg-surface-800/20 overflow-hidden animate-slide-up">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500">Urun</th>
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-gray-500">Adet</th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500">Birim Fiyat</th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500">Alis</th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500">Komisyon</th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500">Kargo</th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500">Kar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {order.items.map((item) => (
                    <tr key={item.id} className="text-xs">
                      <td className="px-3 py-2 text-gray-300">{item.product_name}</td>
                      <td className="px-3 py-2 text-center text-gray-400">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{item.unit_price.toLocaleString('tr-TR')} TL</td>
                      <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{item.buy_price_at_sale.toLocaleString('tr-TR')} TL</td>
                      <td className="px-3 py-2 text-right text-gray-400 tabular-nums">%{Math.round(item.commission_rate_at_sale * 100)}</td>
                      <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{item.shipping_share.toLocaleString('tr-TR')} TL</td>
                      <td className={cn('px-3 py-2 text-right font-medium tabular-nums', item.net_profit >= 0 ? 'text-success-400' : 'text-danger-400')}>
                        {item.net_profit >= 0 ? '+' : ''}{item.net_profit.toLocaleString('tr-TR')} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
