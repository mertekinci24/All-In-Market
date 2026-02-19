import { useState, useEffect, useMemo } from 'react'
import { X, Zap, PackageOpen, RotateCcw, Banknote, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PackagingPopup } from '@/components/products/PackagingPopup'
import { calculateProfit } from '@/lib/financial-engine'
import type { CommissionResolution } from '@/lib/financial-engine'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
  product?: ProductRow | null
  commissionResolution?: CommissionResolution | null
}

export interface ProductFormData {
  name: string
  external_id: string
  sales_price: number
  buy_price: number
  commission_rate: number
  vat_rate: number
  desi: number
  shipping_cost: number
  extra_cost: number
  ad_cost: number
  stock_status: string
  category: string
  marketplace_url: string
  packaging_cost: number
  packaging_vat_included: boolean
  return_rate: number
  service_fee: number
}

const INITIAL: ProductFormData = {
  name: '',
  external_id: '',
  sales_price: 0,
  buy_price: 0,
  commission_rate: 0.15,
  vat_rate: 20,
  desi: 1,
  shipping_cost: 0,
  extra_cost: 0,
  ad_cost: 0,
  stock_status: 'InStock',
  category: '',
  marketplace_url: '',
  packaging_cost: 0,
  packaging_vat_included: true,
  return_rate: 0,
  service_fee: 0,
}

export function ProductModal({ open, onClose, onSave, product, commissionResolution }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [packagingOpen, setPackagingOpen] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        external_id: product.external_id ?? '',
        sales_price: product.sales_price ?? 0,
        buy_price: product.buy_price,
        commission_rate: product.commission_rate,
        vat_rate: product.vat_rate,
        desi: product.desi,
        shipping_cost: product.shipping_cost,
        extra_cost: product.extra_cost,
        ad_cost: product.ad_cost,
        stock_status: product.stock_status,
        category: product.category ?? '',
        marketplace_url: product.marketplace_url ?? '',
        packaging_cost: product.packaging_cost ?? 0,
        packaging_vat_included: product.packaging_vat_included ?? true,
        return_rate: product.return_rate ?? 0,
        service_fee: product.service_fee ?? 0,
      })
    } else {
      setForm(INITIAL)
    }
    setError('')
  }, [product, open])

  if (!open) return null

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Urun adi zorunludur')
      return
    }
    if (form.buy_price <= 0) {
      setError('Alis maliyeti 0\'dan buyuk olmalidir')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch {
      setError('Kaydetme islemi basarisiz oldu')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof ProductFormData, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-slide-up rounded-xl border border-white/5 bg-surface-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100">
            {product ? 'Urunu Duzenle' : 'Yeni Urun Ekle'}
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

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <Input
            label="Urun Adi"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Bluetooth Kulaklik Pro"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Urun Kodu"
              value={form.external_id}
              onChange={(e) => set('external_id', e.target.value)}
              placeholder="p-12345"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Stok Durumu</label>
              <select
                value={form.stock_status}
                onChange={(e) => set('stock_status', e.target.value)}
                className="h-9 w-full rounded-lg border border-white/5 bg-surface-800/50 px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              >
                <option value="InStock">Stokta</option>
                <option value="Low">Az</option>
                <option value="OutOfStock">Tukendi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Satis Fiyati (TL)"
              type="number"
              value={form.sales_price || ''}
              onChange={(e) => set('sales_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <Input
              label="Alis Maliyeti (TL)"
              type="number"
              value={form.buy_price || ''}
              onChange={(e) => set('buy_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Komisyon (%)"
              type="number"
              value={Math.round(form.commission_rate * 100) || ''}
              onChange={(e) => set('commission_rate', (parseFloat(e.target.value) || 0) / 100)}
              placeholder="15"
            />
            <Input
              label="KDV (%)"
              type="number"
              value={form.vat_rate || ''}
              onChange={(e) => set('vat_rate', parseInt(e.target.value) || 0)}
              placeholder="20"
            />
            <Input
              label="Desi"
              type="number"
              value={form.desi || ''}
              onChange={(e) => set('desi', parseFloat(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          {/* Campaign Commission Indicator */}
          {commissionResolution?.isCampaignActive && product && (
            <div className="flex items-center gap-2 rounded-lg border border-success-500/20 bg-success-500/5 px-3 py-2 animate-fade-in">
              <Zap className="h-3.5 w-3.5 text-success-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 line-through">%{Math.round(product.commission_rate * 100)}</span>
                <span className="text-gray-500">→</span>
                <span className="font-semibold text-success-400">%{Math.round(commissionResolution.rate * 100)}</span>
                <span className="text-gray-400 ml-1">({commissionResolution.campaignName})</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Kargo (TL)"
              type="number"
              value={form.shipping_cost || ''}
              onChange={(e) => set('shipping_cost', parseFloat(e.target.value) || 0)}
              placeholder="Otomatik"
            />
            <Input
              label="Ek Gider (TL)"
              type="number"
              value={form.extra_cost || ''}
              onChange={(e) => set('extra_cost', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <Input
              label="Reklam (TL)"
              type="number"
              value={form.ad_cost || ''}
              onChange={(e) => set('ad_cost', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* Advanced Cost Fields */}
          <div className="rounded-lg border border-white/5 bg-surface-800/20 p-3 space-y-3">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Gelişmiş Gider Katmanları</p>

            {/* Packaging */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageOpen className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs text-gray-400">Paketleme</span>
                {form.packaging_cost > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 tabular-nums">
                    {form.packaging_cost.toLocaleString('tr-TR')} TL
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPackagingOpen(true)}
                className="rounded-md border border-white/5 bg-surface-800/50 px-2.5 py-1 text-[11px] text-gray-400 transition-all hover:border-amber-500/20 hover:text-amber-300"
              >
                {form.packaging_cost > 0 ? 'Düzenle' : 'Ekle'}
              </button>
            </div>

            {/* Return Rate + Service Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="İade Oranı (%)"
                  type="number"
                  value={form.return_rate || ''}
                  onChange={(e) => set('return_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                <RotateCcw className="absolute top-[1px] right-0 h-3 w-3 text-gray-600" />
              </div>
              <div className="relative">
                <Input
                  label="Hizmet Bedeli (TL)"
                  type="number"
                  value={form.service_fee || ''}
                  onChange={(e) => set('service_fee', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                <Banknote className="absolute top-[1px] right-0 h-3 w-3 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Live Margin Preview */}
          <LiveMarginPreview form={form} commissionRate={commissionResolution?.rate ?? form.commission_rate} />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kategori"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Elektronik"
            />
            <Input
              label="Pazaryeri Linki"
              value={form.marketplace_url}
              onChange={(e) => set('marketplace_url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Iptal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Kaydediliyor...' : product ? 'Guncelle' : 'Ekle'}
          </Button>
        </div>
      </div>

      {/* Packaging Popup */}
      <PackagingPopup
        open={packagingOpen}
        onClose={() => setPackagingOpen(false)}
        onSave={(totalCost, vatIncluded) => {
          set('packaging_cost', totalCost)
          set('packaging_vat_included', vatIncluded)
        }}
        initialCost={form.packaging_cost}
        initialVatIncluded={form.packaging_vat_included}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Live Margin Preview                                                */
/* ------------------------------------------------------------------ */

function LiveMarginPreview({ form, commissionRate }: { form: ProductFormData; commissionRate: number }) {
  const result = useMemo(() => {
    if (form.sales_price <= 0 || form.buy_price <= 0) return null
    return calculateProfit({
      salesPrice: form.sales_price,
      buyPrice: form.buy_price,
      commissionRate,
      vatRate: form.vat_rate,
      desi: form.desi,
      shippingCost: form.shipping_cost,
      extraCost: form.extra_cost,
      adCost: form.ad_cost,
      packagingCost: form.packaging_cost,
      packagingVatIncluded: form.packaging_vat_included,
      returnRate: form.return_rate,
      serviceFee: form.service_fee,
    })
  }, [form, commissionRate])

  if (!result) return null

  const isProfit = result.netProfit >= 0

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 animate-fade-in transition-colors ${isProfit
        ? 'border-success-500/20 bg-success-500/5'
        : 'border-danger-500/20 bg-danger-500/5'
      }`}>
      <div className="flex items-center gap-2">
        {isProfit ? (
          <TrendingUp className="h-3.5 w-3.5 text-success-400" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-danger-400" />
        )}
        <span className="text-xs text-gray-400">Tahmini Kar</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold tabular-nums ${isProfit ? 'text-success-400' : 'text-danger-400'}`}>
          {isProfit ? '+' : ''}{result.netProfit.toLocaleString('tr-TR')} TL
        </span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isProfit ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'
          }`}>
          %{result.margin}
        </span>
      </div>
    </div>
  )
}
