import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { calculateProfit, resolveShippingCost } from '@/lib/financial-engine'
import type { ShippingRate } from '@/lib/financial-engine'
import type { OrderWithItems } from '@/hooks/useOrders'
import type { ProductWithProfit } from '@/hooks/useProducts'

export interface OrderFormData {
  order_number: string
  marketplace_order_id: string
  order_date: string
  campaign_name: string
  campaign_seller_share: number
  campaign_marketplace_share: number
  status: string
  notes: string
}

export interface OrderLineItem {
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  buy_price_at_sale: number
  commission_rate_at_sale: number
  vat_rate_at_sale: number
  shipping_share: number
  extra_cost: number
  ad_cost: number
  net_profit: number
}

interface OrderModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: OrderFormData, items: OrderLineItem[]) => Promise<void>
  order?: OrderWithItems | null
  products: ProductWithProfit[]
  shippingRates: ShippingRate[]
}

const INITIAL_FORM: OrderFormData = {
  order_number: '',
  marketplace_order_id: '',
  order_date: new Date().toISOString().slice(0, 16),
  campaign_name: '',
  campaign_seller_share: 0,
  campaign_marketplace_share: 0,
  status: 'pending',
  notes: '',
}

function createEmptyLine(): OrderLineItem {
  return {
    product_id: null,
    product_name: '',
    quantity: 1,
    unit_price: 0,
    buy_price_at_sale: 0,
    commission_rate_at_sale: 0.15,
    vat_rate_at_sale: 20,
    shipping_share: 0,
    extra_cost: 0,
    ad_cost: 0,
    net_profit: 0,
  }
}

function computeLineProfit(line: OrderLineItem): number {
  const result = calculateProfit({
    salesPrice: line.unit_price * line.quantity,
    buyPrice: line.buy_price_at_sale * line.quantity,
    commissionRate: line.commission_rate_at_sale,
    vatRate: line.vat_rate_at_sale,
    desi: 0,
    shippingCost: line.shipping_share,
    extraCost: line.extra_cost * line.quantity,
    adCost: line.ad_cost * line.quantity,
  })
  return result.netProfit
}

export function OrderModal({ open, onClose, onSave, order, products, shippingRates }: OrderModalProps) {
  const [form, setForm] = useState<OrderFormData>(INITIAL_FORM)
  const [lines, setLines] = useState<OrderLineItem[]>([createEmptyLine()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (order) {
      setForm({
        order_number: order.order_number,
        marketplace_order_id: order.marketplace_order_id,
        order_date: order.order_date ? new Date(order.order_date).toISOString().slice(0, 16) : '',
        campaign_name: order.campaign_name,
        campaign_seller_share: order.campaign_seller_share,
        campaign_marketplace_share: order.campaign_marketplace_share,
        status: order.status,
        notes: order.notes,
      })
      if (order.items.length > 0) {
        setLines(order.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          buy_price_at_sale: item.buy_price_at_sale,
          commission_rate_at_sale: item.commission_rate_at_sale,
          vat_rate_at_sale: item.vat_rate_at_sale,
          shipping_share: item.shipping_share,
          extra_cost: item.extra_cost,
          ad_cost: item.ad_cost,
          net_profit: item.net_profit,
        })))
      } else {
        setLines([createEmptyLine()])
      }
    } else {
      setForm(INITIAL_FORM)
      setLines([createEmptyLine()])
    }
    setError('')
  }, [order, open])

  if (!open) return null

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const shippingCost = product.shipping_cost > 0
      ? product.shipping_cost
      : resolveShippingCost(product.desi, product.sales_price ?? 0, shippingRates)

    setLines((prev) => prev.map((line, i) => {
      if (i !== index) return line
      const updated: OrderLineItem = {
        ...line,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.sales_price ?? 0,
        buy_price_at_sale: product.buy_price,
        commission_rate_at_sale: product.commission_rate,
        vat_rate_at_sale: product.vat_rate,
        shipping_share: shippingCost,
        extra_cost: product.extra_cost,
        ad_cost: product.ad_cost,
        net_profit: 0,
      }
      updated.net_profit = computeLineProfit(updated)
      return updated
    }))
  }

  const updateLine = (index: number, field: keyof OrderLineItem, value: string | number) => {
    setLines((prev) => prev.map((line, i) => {
      if (i !== index) return line
      const updated = { ...line, [field]: value }
      updated.net_profit = computeLineProfit(updated)
      return updated
    }))
  }

  const addLine = () => setLines((prev) => [...prev, createEmptyLine()])

  const removeLine = (index: number) => {
    setLines((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index))
  }

  const totals = lines.reduce((acc, line) => ({
    amount: acc.amount + line.unit_price * line.quantity,
    shipping: acc.shipping + line.shipping_share,
    commission: acc.commission + (line.unit_price * line.quantity * line.commission_rate_at_sale),
    profit: acc.profit + line.net_profit,
  }), { amount: 0, shipping: 0, commission: 0, profit: 0 })

  const handleSubmit = async () => {
    const validLines = lines.filter((l) => l.product_name.trim())
    if (validLines.length === 0) {
      setError('En az bir urun satiri ekleyin')
      return
    }
    if (!form.order_number.trim()) {
      setError('Siparis numarasi zorunludur')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form, validLines)
      onClose()
    } catch {
      setError('Kaydetme islemi basarisiz oldu')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof OrderFormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl animate-slide-up rounded-xl border border-white/5 bg-surface-900 p-5 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">
            {order ? 'Siparisi Duzenle' : 'Yeni Siparis'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-danger-500/20 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Siparis No"
              value={form.order_number}
              onChange={(e) => set('order_number', e.target.value)}
              placeholder="TY-123456"
            />
            <Input
              label="Pazaryeri ID"
              value={form.marketplace_order_id}
              onChange={(e) => set('marketplace_order_id', e.target.value)}
              placeholder="MP-789"
            />
            <Input
              label="Siparis Tarihi"
              type="datetime-local"
              value={form.order_date}
              onChange={(e) => set('order_date', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Kampanya Adi"
              value={form.campaign_name}
              onChange={(e) => set('campaign_name', e.target.value)}
              placeholder="Indirim Kampanyasi"
            />
            <Input
              label="Satici Payi (%)"
              type="number"
              value={form.campaign_seller_share ? Math.round(form.campaign_seller_share * 100) : ''}
              onChange={(e) => set('campaign_seller_share', (parseFloat(e.target.value) || 0) / 100)}
              placeholder="0"
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Durum</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="h-9 w-full rounded-lg border border-white/5 bg-surface-800/50 px-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50"
              >
                <option value="pending">Beklemede</option>
                <option value="shipped">Kargoda</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="returned">Iade</option>
                <option value="cancelled">Iptal</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">Siparis Kalemleri</label>
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" />
                Kalem Ekle
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="rounded-lg border border-white/5 bg-surface-800/30 p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="mb-1 block text-[11px] text-gray-500">Urun</label>
                      <select
                        value={line.product_id ?? ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleProductSelect(idx, e.target.value)
                          } else {
                            updateLine(idx, 'product_name', '')
                            updateLine(idx, 'product_id', '')
                          }
                        }}
                        className="h-8 w-full rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      >
                        <option value="">Urun sec...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="mb-1 block text-[11px] text-gray-500">Adet</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-8 w-full rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] text-gray-500">Birim Fiyat</label>
                      <input
                        type="number"
                        value={line.unit_price || ''}
                        onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 w-full rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 text-right focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] text-gray-500">Alis</label>
                      <input
                        type="number"
                        value={line.buy_price_at_sale || ''}
                        onChange={(e) => updateLine(idx, 'buy_price_at_sale', parseFloat(e.target.value) || 0)}
                        className="h-8 w-full rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 text-right focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-center">
                      <span className={`text-xs font-medium tabular-nums ${line.net_profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                        {line.net_profit >= 0 ? '+' : ''}{line.net_profit.toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-danger-500/10 hover:text-danger-400 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-5 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">Komisyon (%)</label>
                      <input
                        type="number"
                        value={Math.round(line.commission_rate_at_sale * 100) || ''}
                        onChange={(e) => updateLine(idx, 'commission_rate_at_sale', (parseFloat(e.target.value) || 0) / 100)}
                        className="h-7 w-full rounded-md border border-white/5 bg-surface-800/50 px-2 text-[11px] text-gray-400 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">KDV (%)</label>
                      <input
                        type="number"
                        value={line.vat_rate_at_sale || ''}
                        onChange={(e) => updateLine(idx, 'vat_rate_at_sale', parseInt(e.target.value) || 0)}
                        className="h-7 w-full rounded-md border border-white/5 bg-surface-800/50 px-2 text-[11px] text-gray-400 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">Kargo</label>
                      <input
                        type="number"
                        value={line.shipping_share || ''}
                        onChange={(e) => updateLine(idx, 'shipping_share', parseFloat(e.target.value) || 0)}
                        className="h-7 w-full rounded-md border border-white/5 bg-surface-800/50 px-2 text-[11px] text-gray-400 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">Ek Gider</label>
                      <input
                        type="number"
                        value={line.extra_cost || ''}
                        onChange={(e) => updateLine(idx, 'extra_cost', parseFloat(e.target.value) || 0)}
                        className="h-7 w-full rounded-md border border-white/5 bg-surface-800/50 px-2 text-[11px] text-gray-400 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">Reklam</label>
                      <input
                        type="number"
                        value={line.ad_cost || ''}
                        onChange={(e) => updateLine(idx, 'ad_cost', parseFloat(e.target.value) || 0)}
                        className="h-7 w-full rounded-md border border-white/5 bg-surface-800/50 px-2 text-[11px] text-gray-400 text-center focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-surface-800/20 p-3">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-[11px] text-gray-500">Toplam Tutar</p>
                <p className="text-sm font-semibold text-gray-200 tabular-nums">
                  {totals.amount.toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Kargo</p>
                <p className="text-sm font-semibold text-gray-200 tabular-nums">
                  {totals.shipping.toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Komisyon</p>
                <p className="text-sm font-semibold text-gray-200 tabular-nums">
                  {Math.round(totals.commission * 100) / 100} TL
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Net Kar</p>
                <p className={`text-sm font-semibold tabular-nums ${totals.profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {totals.profit >= 0 ? '+' : ''}{Math.round(totals.profit * 100) / 100} TL
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Notlar"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Siparis ile ilgili notlar..."
          />
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Iptal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Kaydediliyor...' : order ? 'Guncelle' : 'Olustur'}
          </Button>
        </div>
      </div>
    </div>
  )
}
