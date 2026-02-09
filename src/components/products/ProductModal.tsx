import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: ProductFormData) => Promise<void>
  product?: ProductRow | null
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
}

export function ProductModal({ open, onClose, onSave, product }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const set = (field: keyof ProductFormData, value: string | number) =>
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
    </div>
  )
}
