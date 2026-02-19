
import { useState, useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { useNotifications } from '@/hooks/useNotifications'

type NotifHook = ReturnType<typeof useNotifications>

interface AlertPreferencesProps {
  settings: NotifHook['settings']
  saving: NotifHook['saving']
  onSave: NotifHook['save']
}

interface ToggleItem {
  key: 'notify_price_drop' | 'notify_margin_warning' | 'notify_stock_change' | 'notify_competitor_change'
  label: string
  description: string
}

const TOGGLES: ToggleItem[] = [
  { key: 'notify_price_drop', label: 'Fiyat Dususu', description: 'Urun fiyati belirlenen esik altina dustugunde' },
  { key: 'notify_margin_warning', label: 'Marj Uyarisi', description: 'Kar marji minimum esik degerinin altina indiginde' },
  { key: 'notify_stock_change', label: 'Stok Degisikligi', description: 'Urun stok durumu degistiginde' },
  { key: 'notify_competitor_change', label: 'Rakip Fiyat', description: 'Rakip fiyatinda onemli degisiklik tespit edildiginde' },
]

export function AlertPreferences({ settings, saving, onSave }: AlertPreferencesProps) {
  const [marginThreshold, setMarginThreshold] = useState('10')
  const [priceThreshold, setPriceThreshold] = useState('5')
  const [stockThreshold, setStockThreshold] = useState('10')
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notify_price_drop: true,
    notify_margin_warning: true,
    notify_stock_change: true,
    notify_competitor_change: true,
  })

  useEffect(() => {
    if (settings) {
      setMarginThreshold(String(settings.margin_threshold))
      setPriceThreshold(String(settings.price_change_threshold))
      setStockThreshold(String(settings.stock_threshold ?? 10))
      setToggles({
        notify_price_drop: settings.notify_price_drop,
        notify_margin_warning: settings.notify_margin_warning,
        notify_stock_change: settings.notify_stock_change,
        notify_competitor_change: settings.notify_competitor_change,
      })
    }
  }, [settings])

  function handleToggle(key: string) {
    const next = { ...toggles, [key]: !toggles[key] }
    setToggles(next)
    onSave({ [key]: next[key] })
  }

  function handleSaveThresholds() {
    const mt = parseFloat(marginThreshold)
    const pt = parseFloat(priceThreshold)
    const st = parseInt(stockThreshold)
    if (isNaN(mt) || isNaN(pt) || isNaN(st)) return
    onSave({ margin_threshold: mt, price_change_threshold: pt, stock_threshold: st })
  }

  const thresholdsDirty =
    marginThreshold !== String(settings?.margin_threshold ?? '10') ||
    priceThreshold !== String(settings?.price_change_threshold ?? '5') ||
    stockThreshold !== String(settings?.stock_threshold ?? '10')

  return (
    <Card>
      <CardHeader
        title="Bildirim Tercihleri"
        subtitle="Hangi durumlarda uyari alinacagini belirleyin"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-500/10 text-warning-400">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
        }
      />

      <div className="space-y-3">
        {TOGGLES.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-800/30 p-3"
          >
            <div>
              <p className="text-xs font-medium text-gray-300">{item.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={() => handleToggle(item.key)}
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
                toggles[item.key] ? 'bg-brand-500' : 'bg-surface-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200',
                  toggles[item.key] ? 'left-[18px]' : 'left-0.5'
                )}
              />
            </button>
          </div>
        ))}

        <div className="mt-2 pt-3 border-t border-white/5">
          <p className="text-xs font-medium text-gray-400 mb-2">Esik Degerleri</p>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Min. Marj (%)"
              type="number"
              value={marginThreshold}
              onChange={(e) => setMarginThreshold(e.target.value)}
            />
            <Input
              label="Fiyat Deg. Esigi (%)"
              type="number"
              value={priceThreshold}
              onChange={(e) => setPriceThreshold(e.target.value)}
            />
            <Input
              label="Min. Stok (Adet)"
              type="number"
              value={stockThreshold}
              onChange={(e) => setStockThreshold(e.target.value)}
            />
          </div>
          {thresholdsDirty && (
            <Button size="sm" className="mt-2" onClick={handleSaveThresholds} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Esikleri Kaydet'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
