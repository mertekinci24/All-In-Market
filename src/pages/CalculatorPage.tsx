import { useState, useMemo } from 'react'
import { Calculator, ArrowRight, Truck } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { calculateProfit, resolveShippingCost } from '@/lib/financial-engine'
import type { ShippingRate, CommissionSchedule } from '@/lib/financial-engine'
import { cn } from '@/lib/utils'
import type { ProfitResult } from '@/types'

const MARKETPLACE_LABELS: Record<string, string> = {
  trendyol: 'Trendyol',
  hepsiburada: 'Hepsiburada',
  amazon_tr: 'Amazon TR',
  Trendyol: 'Trendyol',
  Hepsiburada: 'Hepsiburada',
  'Amazon TR': 'Amazon TR',
}

interface CalculatorPageProps {
  shippingRates: ShippingRate[]
  commissionSchedules: CommissionSchedule[]
  marketplace: string
}

export function CalculatorPage({ shippingRates, commissionSchedules, marketplace }: CalculatorPageProps) {
  const [salesPrice, setSalesPrice] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [commissionRate, setCommissionRate] = useState('15')
  const [vatRate, setVatRate] = useState('20')
  const [desi, setDesi] = useState('1')
  const [extraCost, setExtraCost] = useState('0')
  const [adCost, setAdCost] = useState('0')
  const [manualShipping, setManualShipping] = useState('')
  const [result, setResult] = useState<ProfitResult | null>(null)

  const activeStoreWideCampaign = useMemo(() => {
    const now = new Date()
    return commissionSchedules.find((s) => {
      if (!s.is_active || s.product_id !== null) return false
      const from = new Date(s.valid_from)
      const until = new Date(s.valid_until)
      return now >= from && now < until && s.marketplace === marketplace
    })
  }, [commissionSchedules, marketplace])

  const resolvedShipping = useMemo(() => {
    const desiVal = parseFloat(desi) || 1
    const priceVal = parseFloat(salesPrice) || 0
    return resolveShippingCost(desiVal, priceVal, shippingRates)
  }, [desi, salesPrice, shippingRates])

  const effectiveShipping = manualShipping ? parseFloat(manualShipping) || 0 : resolvedShipping

  function handleCalculate() {
    const profitResult = calculateProfit({
      salesPrice: parseFloat(salesPrice) || 0,
      buyPrice: parseFloat(buyPrice) || 0,
      commissionRate: (parseFloat(commissionRate) || 0) / 100,
      vatRate: parseFloat(vatRate) || 0,
      desi: parseFloat(desi) || 1,
      shippingCost: effectiveShipping,
      extraCost: parseFloat(extraCost) || 0,
      adCost: parseFloat(adCost) || 0,
    })
    setResult(profitResult)
  }

  const desiRates = shippingRates.filter((r) => r.rate_type === 'desi')
  const priceRates = shippingRates.filter((r) => r.rate_type === 'price')

  return (
    <div className="animate-fade-in">
      <Header title="Kar Hesaplayici" subtitle="Detayli maliyet ve kar analizi" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader
                title="Maliyet Girdileri"
                subtitle="TL cinsinden degerler girin"
                action={
                  <Badge variant="neutral">
                    {MARKETPLACE_LABELS[marketplace] ?? marketplace}
                  </Badge>
                }
              />
              <div className="space-y-3">
                <Input
                  label="Satis Fiyati (TL)"
                  type="number"
                  placeholder="0.00"
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(e.target.value)}
                />
                <Input
                  label="Alis Maliyeti (TL)"
                  type="number"
                  placeholder="0.00"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Komisyon (%)"
                      type="number"
                      placeholder="15"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                    />
                    {activeStoreWideCampaign && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge variant="success" className="text-[10px]">
                          Kampanya
                        </Badge>
                        <span className="text-[10px] text-gray-500 truncate">
                          {activeStoreWideCampaign.campaign_name || 'Aktif'} (%{Math.round(activeStoreWideCampaign.campaign_rate * 100)})
                        </span>
                      </div>
                    )}
                  </div>
                  <Input
                    label="KDV (%)"
                    type="number"
                    placeholder="20"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </div>
                <Input
                  label="Desi"
                  type="number"
                  placeholder="1"
                  value={desi}
                  onChange={(e) => setDesi(e.target.value)}
                />

                <div className="rounded-lg border border-white/5 bg-surface-800/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-brand-400" />
                      <span className="text-xs font-medium text-gray-300">Kargo Ucreti</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-400 tabular-nums">
                      {effectiveShipping.toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                  {!manualShipping && (
                    <p className="text-[11px] text-gray-500">
                      Barem tablosundan otomatik hesaplandi
                    </p>
                  )}
                  <Input
                    label="Manuel Kargo (bos = otomatik)"
                    type="number"
                    placeholder="Otomatik barem"
                    value={manualShipping}
                    onChange={(e) => setManualShipping(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ek Giderler (TL)"
                    type="number"
                    placeholder="0"
                    value={extraCost}
                    onChange={(e) => setExtraCost(e.target.value)}
                  />
                  <Input
                    label="Reklam Maliyeti (TL)"
                    type="number"
                    placeholder="0"
                    value={adCost}
                    onChange={(e) => setAdCost(e.target.value)}
                  />
                </div>
                <Button className="w-full mt-2" onClick={handleCalculate}>
                  <Calculator className="h-4 w-4" />
                  Hesapla
                </Button>
              </div>
            </Card>

            {shippingRates.length > 0 && (
              <Card>
                <CardHeader
                  title="Kargo Barem Tablosu"
                  subtitle={MARKETPLACE_LABELS[marketplace] ?? marketplace}
                  action={
                    <Truck className="h-4 w-4 text-gray-500" />
                  }
                />
                {desiRates.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Desi Bazli
                    </p>
                    <div className="space-y-1">
                      {[...desiRates].sort((a, b) => a.min_value - b.min_value).map((rate) => (
                        <div
                          key={`desi-${rate.min_value}`}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded transition-colors hover:bg-white/[0.02]"
                        >
                          <span className="text-gray-400">
                            {rate.min_value} - {rate.max_value} desi
                          </span>
                          <span className="font-medium text-gray-300 tabular-nums">
                            {rate.cost.toLocaleString('tr-TR')} TL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {priceRates.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Fiyat Bazli
                    </p>
                    <div className="space-y-1">
                      {[...priceRates].sort((a, b) => a.min_value - b.min_value).map((rate) => (
                        <div
                          key={`price-${rate.min_value}`}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded transition-colors hover:bg-white/[0.02]"
                        >
                          <span className="text-gray-400">
                            {rate.min_value} - {rate.max_value >= 999999 ? '+' : rate.max_value} TL
                          </span>
                          <span className={cn(
                            'font-medium tabular-nums',
                            rate.cost === 0 ? 'text-success-400' : 'text-gray-300'
                          )}>
                            {rate.cost === 0 ? 'Ucretsiz' : `${rate.cost.toLocaleString('tr-TR')} TL`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="lg:col-span-3 space-y-4">
            {result ? (
              <>
                <Card className={cn(
                  'border-l-4 animate-scale-in',
                  result.netProfit >= 0 ? 'border-l-success-500' : 'border-l-danger-500'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Kar</p>
                      <p className={cn(
                        'text-3xl font-semibold tracking-tight mt-1',
                        result.netProfit >= 0 ? 'text-success-400' : 'text-danger-400'
                      )}>
                        {result.netProfit >= 0 ? '+' : ''}{result.netProfit.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Marj</p>
                        <Badge variant={result.margin >= 0 ? 'success' : 'danger'} className="mt-1">
                          %{result.margin}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">ROI</p>
                        <Badge variant={result.roi >= 0 ? 'success' : 'danger'} className="mt-1">
                          %{result.roi}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="animate-scale-in stagger-1">
                  <CardHeader title="Maliyet Dagilimi" />
                  <div className="space-y-2">
                    <CostRow label="Satis Fiyati" value={result.salesPrice} />
                    <div className="border-t border-white/5 pt-2 space-y-2">
                      <CostRow label="Alis Maliyeti" value={result.buyPrice} negative />
                      <CostRow label="KDV" value={result.vat} negative />
                      <CostRow label="Komisyon" value={result.commission} negative />
                      <CostRow
                        label={`Kargo${manualShipping ? ' (Manuel)' : ' (Barem)'}`}
                        value={result.shippingCost}
                        negative
                      />
                      {result.extraCost > 0 && <CostRow label="Ek Giderler" value={result.extraCost} negative />}
                      {result.adCost > 0 && <CostRow label="Reklam" value={result.adCost} negative />}
                    </div>
                    <div className="border-t border-white/5 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">Toplam Maliyet</span>
                        <span className="text-sm font-semibold text-danger-400">
                          -{result.totalCost.toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-400">Degerlerinizi girin ve hesapla butonuna tiklayin</p>
                <p className="text-xs text-gray-600 mt-1">Net kar, marj ve ROI otomatik hesaplanacak</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between transition-colors duration-150 hover:bg-white/[0.02] -mx-1 px-1 rounded">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', negative ? 'text-gray-300' : 'text-gray-200')}>
        {negative ? '-' : ''}{value.toLocaleString('tr-TR')} TL
      </span>
    </div>
  )
}
