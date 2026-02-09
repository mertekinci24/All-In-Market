import { useState } from 'react'
import { Calculator, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { calculateProfit, getDesiShippingCost } from '@/lib/financial-engine'
import { cn } from '@/lib/utils'
import type { ProfitResult } from '@/types'

export function CalculatorPage() {
  const [salesPrice, setSalesPrice] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [commissionRate, setCommissionRate] = useState('15')
  const [vatRate, setVatRate] = useState('20')
  const [desi, setDesi] = useState('1')
  const [extraCost, setExtraCost] = useState('0')
  const [adCost, setAdCost] = useState('0')
  const [result, setResult] = useState<ProfitResult | null>(null)

  function handleCalculate() {
    const desiVal = parseFloat(desi) || 1
    const profitResult = calculateProfit({
      salesPrice: parseFloat(salesPrice) || 0,
      buyPrice: parseFloat(buyPrice) || 0,
      commissionRate: (parseFloat(commissionRate) || 0) / 100,
      vatRate: parseFloat(vatRate) || 0,
      desi: desiVal,
      shippingCost: getDesiShippingCost(desiVal),
      extraCost: parseFloat(extraCost) || 0,
      adCost: parseFloat(adCost) || 0,
    })
    setResult(profitResult)
  }

  return (
    <div className="animate-fade-in">
      <Header title="Kar Hesaplayici" subtitle="Detayli maliyet ve kar analizi" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="Maliyet Girdileri" subtitle="TL cinsinden degerler girin" />
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
                  <Input
                    label="Komisyon (%)"
                    type="number"
                    placeholder="15"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
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
                      <CostRow label="Kargo (Desi)" value={result.shippingCost} negative />
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
