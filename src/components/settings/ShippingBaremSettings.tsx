import { useState } from 'react'
import { Truck, RotateCcw, Save, Plus, X } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useShippingRates } from '@/hooks/useShippingRates'

const MARKETPLACE_LABELS: Record<string, string> = {
  trendyol: 'Trendyol',
  hepsiburada: 'Hepsiburada',
  amazon_tr: 'Amazon TR',
}

interface ShippingBaremSettingsProps {
  storeId: string
  marketplace: string
}

export function ShippingBaremSettings({ storeId, marketplace }: ShippingBaremSettingsProps) {
  const {
    rates,
    loading,
    upsertRate,
    resetToDefaults,
    hasCustomRates,
  } = useShippingRates(storeId, marketplace)

  const [editingRate, setEditingRate] = useState<{
    rate_type: 'desi' | 'price'
    min_value: number
    max_value: string
    cost: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRate, setNewRate] = useState({ rate_type: 'desi' as 'desi' | 'price', min_value: '', max_value: '', cost: '' })

  const desiRates = [...rates.filter((r) => r.rate_type === 'desi')].sort((a, b) => a.min_value - b.min_value)
  const priceRates = [...rates.filter((r) => r.rate_type === 'price')].sort((a, b) => a.min_value - b.min_value)

  const handleEdit = (rate: typeof rates[number]) => {
    setEditingRate({
      rate_type: rate.rate_type as 'desi' | 'price',
      min_value: rate.min_value,
      max_value: String(rate.max_value),
      cost: String(rate.cost),
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRate) return
    setSaving(true)
    await upsertRate({
      store_id: storeId,
      marketplace,
      rate_type: editingRate.rate_type,
      min_value: editingRate.min_value,
      max_value: parseFloat(editingRate.max_value) || 0,
      cost: parseFloat(editingRate.cost) || 0,
      vat_included: true,
      is_active: true,
    })
    setEditingRate(null)
    setSaving(false)
  }

  const handleAddRate = async () => {
    setSaving(true)
    await upsertRate({
      store_id: storeId,
      marketplace,
      rate_type: newRate.rate_type,
      min_value: parseFloat(newRate.min_value) || 0,
      max_value: parseFloat(newRate.max_value) || 0,
      cost: parseFloat(newRate.cost) || 0,
      vat_included: true,
      is_active: true,
    })
    setNewRate({ rate_type: 'desi', min_value: '', max_value: '', cost: '' })
    setShowAddForm(false)
    setSaving(false)
  }

  const handleReset = async () => {
    setResetting(true)
    await resetToDefaults()
    setResetting(false)
  }

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Kargo Barem Tablosu"
        subtitle={`${MARKETPLACE_LABELS[marketplace] ?? marketplace} kargo ucret barimleri`}
        action={
          <div className="flex items-center gap-2">
            {hasCustomRates && (
              <Badge variant="warning">Ozel</Badge>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
        }
      />

      <RateTable
        title="Desi Bazli Ucretler"
        unit="desi"
        rates={desiRates}
        editingRate={editingRate}
        onEdit={handleEdit}
        onEditChange={setEditingRate}
        onSave={handleSaveEdit}
        onCancel={() => setEditingRate(null)}
        saving={saving}
      />

      <div className="my-4 border-t border-white/5" />

      <RateTable
        title="Fiyat Bazli Ucretler"
        unit="TL"
        rates={priceRates}
        editingRate={editingRate}
        onEdit={handleEdit}
        onEditChange={setEditingRate}
        onSave={handleSaveEdit}
        onCancel={() => setEditingRate(null)}
        saving={saving}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {!showAddForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Kademe Ekle
          </Button>
        )}
        {hasCustomRates && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resetting ? 'Sifirlanıyor...' : 'Varsayilana Don'}
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="mt-3 rounded-lg border border-white/5 bg-surface-800/30 p-3 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-300">Yeni Kademe Ekle</p>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <select
              value={newRate.rate_type}
              onChange={(e) => setNewRate((prev) => ({ ...prev, rate_type: e.target.value as 'desi' | 'price' }))}
              className="h-8 rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="desi">Desi</option>
              <option value="price">Fiyat</option>
            </select>
            <input
              type="number"
              placeholder="Min"
              value={newRate.min_value}
              onChange={(e) => setNewRate((prev) => ({ ...prev, min_value: e.target.value }))}
              className="h-8 rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <input
              type="number"
              placeholder="Max"
              value={newRate.max_value}
              onChange={(e) => setNewRate((prev) => ({ ...prev, max_value: e.target.value }))}
              className="h-8 rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            <input
              type="number"
              placeholder="Ucret (TL)"
              value={newRate.cost}
              onChange={(e) => setNewRate((prev) => ({ ...prev, cost: e.target.value }))}
              className="h-8 rounded-lg border border-white/5 bg-surface-800/50 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleAddRate} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

type RateType = 'desi' | 'price'

interface RateTableProps {
  title: string
  unit: string
  rates: { rate_type: RateType; min_value: number; max_value: number; cost: number; vat_included: boolean }[]
  editingRate: { rate_type: RateType; min_value: number; max_value: string; cost: string } | null
  onEdit: (rate: RateTableProps['rates'][number]) => void
  onEditChange: (rate: { rate_type: RateType; min_value: number; max_value: string; cost: string } | null) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

function RateTable({ title, unit, rates, editingRate, onEdit, onEditChange, onSave, onCancel, saving }: RateTableProps) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      {rates.length === 0 ? (
        <p className="text-xs text-gray-600 italic">Kademe tanimlanmamis</p>
      ) : (
        <div className="space-y-1">
          {rates.map((rate) => {
            const isEditing =
              editingRate?.rate_type === rate.rate_type &&
              editingRate?.min_value === rate.min_value

            if (isEditing && editingRate) {
              return (
                <div
                  key={`${rate.rate_type}-${rate.min_value}`}
                  className="flex items-center gap-2 py-1 px-2 rounded bg-brand-500/5 border border-brand-500/20"
                >
                  <span className="text-xs text-gray-400 w-20 shrink-0">
                    {rate.min_value} {unit} -
                  </span>
                  <input
                    type="number"
                    value={editingRate.max_value}
                    onChange={(e) =>
                      onEditChange({ ...editingRate, max_value: e.target.value } as typeof editingRate)
                    }
                    className="h-6 w-16 rounded border border-white/10 bg-surface-800/50 px-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                  />
                  <span className="text-xs text-gray-500">{unit}</span>
                  <input
                    type="number"
                    value={editingRate.cost}
                    onChange={(e) =>
                      onEditChange({ ...editingRate, cost: e.target.value } as typeof editingRate)
                    }
                    className="h-6 w-20 rounded border border-white/10 bg-surface-800/50 px-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500/50 ml-auto"
                  />
                  <span className="text-xs text-gray-500">TL</span>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex h-6 w-6 items-center justify-center rounded text-success-400 hover:bg-success-500/10 transition-colors"
                  >
                    <Save className="h-3 w-3" />
                  </button>
                  <button
                    onClick={onCancel}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-white/5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={`${rate.rate_type}-${rate.min_value}`}
                onClick={() => onEdit(rate)}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-white/[0.03] group"
              >
                <span className="text-gray-400">
                  {rate.min_value} - {rate.max_value >= 999999 ? '+' : rate.max_value} {unit}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium tabular-nums',
                    rate.cost === 0 ? 'text-success-400' : 'text-gray-300'
                  )}>
                    {rate.cost === 0 ? 'Ucretsiz' : `${rate.cost.toLocaleString('tr-TR')} TL`}
                  </span>
                  <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    duzenle
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
