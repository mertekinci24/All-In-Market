import { useState, useMemo } from 'react'
import { Brain, ArrowRight, ArrowDown, ArrowUp, Sparkles, RotateCcw } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { simulatePriceChange } from '@/lib/financial-engine'
import { getDesiShippingCost } from '@/lib/financial-engine'
import { useAiScenario } from '@/hooks/useAiScenario'
import { cn } from '@/lib/utils'
import type { ProductWithProfit } from '@/hooks/useProducts'

interface AiScenarioPageProps {
  products: ProductWithProfit[]
  loading: boolean
}

export function AiScenarioPage({ products, loading: productsLoading }: AiScenarioPageProps) {
  const [selectedId, setSelectedId] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const { result, loading, error, analyze, reset } = useAiScenario()

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId]
  )

  const simulation = useMemo(() => {
    if (!selectedProduct || !targetPrice) return null
    const tp = parseFloat(targetPrice)
    if (isNaN(tp) || tp <= 0) return null
    return simulatePriceChange(
      {
        salesPrice: selectedProduct.sales_price ?? 0,
        buyPrice: selectedProduct.buy_price,
        commissionRate: selectedProduct.commission_rate,
        vatRate: selectedProduct.vat_rate,
        desi: selectedProduct.desi,
        shippingCost: selectedProduct.shipping_cost > 0
          ? selectedProduct.shipping_cost
          : getDesiShippingCost(selectedProduct.desi),
        extraCost: selectedProduct.extra_cost,
        adCost: selectedProduct.ad_cost,
      },
      tp
    )
  }, [selectedProduct, targetPrice])

  function handleAnalyze() {
    if (!selectedProduct || !simulation) return
    analyze({
      name: selectedProduct.name,
      currentPrice: selectedProduct.sales_price ?? 0,
      targetPrice: parseFloat(targetPrice),
      buyPrice: selectedProduct.buy_price,
      commissionRate: selectedProduct.commission_rate,
      vatRate: selectedProduct.vat_rate,
      shippingCost: selectedProduct.shipping_cost > 0
        ? selectedProduct.shipping_cost
        : getDesiShippingCost(selectedProduct.desi),
      competitorPrice: selectedProduct.competitor_price,
      category: selectedProduct.category || 'Diger',
      currentMargin: simulation.current.margin,
      currentRoi: simulation.current.roi,
      currentNetProfit: simulation.current.netProfit,
      simulatedMargin: simulation.simulated.margin,
      simulatedRoi: simulation.simulated.roi,
      simulatedNetProfit: simulation.simulated.netProfit,
      profitDelta: simulation.profitDelta,
    })
  }

  function handleReset() {
    setSelectedId('')
    setTargetPrice('')
    reset()
  }

  if (productsLoading) {
    return (
      <div className="animate-fade-in">
        <Header title="AI Senaryo Analizi" subtitle="Gemini destekli fiyat simulasyonu ve strateji onerisi" />
        <div className="p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Card>
                <div className="space-y-3">
                  <div className="h-3 w-32 rounded bg-surface-700 animate-shimmer" />
                  <div className="h-9 rounded-lg bg-surface-800/50 animate-shimmer" />
                  <div className="h-9 rounded-lg bg-surface-800/50 animate-shimmer" />
                </div>
              </Card>
            </div>
            <div className="lg:col-span-3">
              <Card className="flex flex-col items-center justify-center py-20">
                <div className="h-14 w-14 rounded-2xl bg-surface-800/50 animate-shimmer" />
                <div className="h-3 w-40 rounded bg-surface-700 animate-shimmer mt-5" />
                <div className="h-2 w-56 rounded bg-surface-800 animate-shimmer mt-2" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <Header title="AI Senaryo Analizi" subtitle="Gemini destekli fiyat simulasyonu ve strateji onerisi" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="Simulasyon Ayarlari" subtitle="Urun sec ve hedef fiyat gir" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-400">Urun</label>
                  <select
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); setTargetPrice(''); reset() }}
                    className="w-full h-9 rounded-lg border border-white/5 bg-surface-800/50 px-3 text-sm text-gray-200 transition-all duration-200 hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 focus:bg-surface-800/70 appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%236b7280\'%3e%3cpath d=\'M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                  >
                    <option value="">Urun secin...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({(p.sales_price ?? 0).toLocaleString('tr-TR')} TL)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="rounded-lg border border-white/5 bg-surface-800/30 p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Mevcut Fiyat</span>
                        <span className="text-gray-200 font-medium">
                          {(selectedProduct.sales_price ?? 0).toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Alis Maliyeti</span>
                        <span className="text-gray-400">{selectedProduct.buy_price.toLocaleString('tr-TR')} TL</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Net Kar</span>
                        <span className={cn('font-medium', selectedProduct.profit.netProfit >= 0 ? 'text-success-400' : 'text-danger-400')}>
                          {selectedProduct.profit.netProfit >= 0 ? '+' : ''}{selectedProduct.profit.netProfit.toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Marj / ROI</span>
                        <span className="text-gray-400">%{selectedProduct.profit.margin} / %{selectedProduct.profit.roi}</span>
                      </div>
                      {selectedProduct.competitor_price != null && selectedProduct.competitor_price > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Rakip Fiyat</span>
                          <span className="text-warning-400">{selectedProduct.competitor_price.toLocaleString('tr-TR')} TL</span>
                        </div>
                      )}
                    </div>

                    <Input
                      label="Hedef Satis Fiyati (TL)"
                      type="number"
                      placeholder="0.00"
                      value={targetPrice}
                      onChange={(e) => { setTargetPrice(e.target.value); reset() }}
                    />

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleAnalyze}
                        disabled={!simulation || loading}
                      >
                        {loading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                        {loading ? 'Analiz Ediliyor...' : 'AI ile Analiz Et'}
                      </Button>
                      {(result || selectedId) && (
                        <Button variant="ghost" onClick={handleReset}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>

            {simulation && (
              <Card className="animate-slide-up">
                <CardHeader title="Simulasyon Sonucu" subtitle="Fiyat degisikliginin etkileri" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Mevcut Kar"
                      value={`${simulation.current.netProfit.toLocaleString('tr-TR')} TL`}
                      positive={simulation.current.netProfit >= 0}
                    />
                    <MetricCard
                      label="Yeni Kar"
                      value={`${simulation.simulated.netProfit.toLocaleString('tr-TR')} TL`}
                      positive={simulation.simulated.netProfit >= 0}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <DeltaChip
                      label="Kar Farki"
                      value={`${simulation.profitDelta >= 0 ? '+' : ''}${simulation.profitDelta.toLocaleString('tr-TR')} TL`}
                      positive={simulation.profitDelta >= 0}
                    />
                    <DeltaChip
                      label="Marj"
                      value={`%${simulation.simulated.margin}`}
                      positive={simulation.simulated.margin >= 0}
                    />
                    <DeltaChip
                      label="ROI"
                      value={`%${simulation.simulated.roi}`}
                      positive={simulation.simulated.roi >= 0}
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            {result ? (
              <Card className="animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <Sparkles className="h-4 w-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-200">AI Strateji Analizi</h3>
                    {result.fallback && (
                      <Badge variant="warning" className="mt-0.5">Kural Tabanli</Badge>
                    )}
                    {!result.fallback && (
                      <Badge variant="success" className="mt-0.5">Gemini Pro</Badge>
                    )}
                  </div>
                </div>
                <div className="ai-analysis-content prose-dark">
                  <AnalysisRenderer text={result.analysis} />
                </div>
              </Card>
            ) : error ? (
              <Card className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-danger-400">{error}</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={handleReset}>
                  Tekrar Dene
                </Button>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center py-20">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 mb-5">
                  <Brain className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-gray-300">AI Fiyat Simulasyonu</p>
                <p className="text-xs text-gray-500 mt-1.5 max-w-sm text-center leading-relaxed">
                  Soldaki panelden bir urun secin, hedef fiyati girin ve AI'dan stratejik analiz alin.
                  Gemini Pro, marj etkisi, rakip durumu ve pazaryeri algoritmasi acisindan analiz yapacak.
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <Step num={1} text="Urun sec" />
                  <ArrowRight className="h-3 w-3 text-gray-600" />
                  <Step num={2} text="Hedef fiyat gir" />
                  <ArrowRight className="h-3 w-3 text-gray-600" />
                  <Step num={3} text="AI Analiz" />
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="rounded-lg border border-white/5 bg-surface-800/30 p-3">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', positive ? 'text-success-400' : 'text-danger-400')}>
        {value}
      </p>
    </div>
  )
}

function DeltaChip({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  const Icon = positive ? ArrowUp : ArrowDown
  return (
    <div className={cn(
      'flex flex-col items-center rounded-lg border p-2',
      positive ? 'border-success-500/10 bg-success-500/5' : 'border-danger-500/10 bg-danger-500/5'
    )}>
      <Icon className={cn('h-3 w-3 mb-0.5', positive ? 'text-success-400' : 'text-danger-400')} />
      <span className={cn('text-xs font-medium tabular-nums', positive ? 'text-success-400' : 'text-danger-400')}>
        {value}
      </span>
      <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/15 text-[10px] font-semibold text-brand-400">
        {num}
      </span>
      <span className="text-xs text-gray-500">{text}</span>
    </div>
  )
}

function AnalysisRenderer({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1.5" />

        if (trimmed.startsWith('**KARAR:') || trimmed.startsWith('**KARAR:**')) {
          const content = trimmed.replace(/\*\*/g, '')
          const isMatch = content.includes('MATCH')
          const isHold = content.includes('HOLD')
          const variant = isHold ? 'danger' : isMatch ? 'warning' : 'success'
          return (
            <div key={i} className={cn(
              'rounded-lg border p-3',
              variant === 'success' ? 'border-success-500/20 bg-success-500/5' :
              variant === 'warning' ? 'border-warning-500/20 bg-warning-500/5' :
              'border-danger-500/20 bg-danger-500/5'
            )}>
              <p className="text-sm font-medium text-gray-200">{content}</p>
            </div>
          )
        }

        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <h4 key={i} className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-3 mb-1">
              {trimmed.replace(/\*\*/g, '')}
            </h4>
          )
        }

        if (trimmed.match(/^\*\*[^*]+\*\*/)) {
          const clean = trimmed.replace(/\*\*/g, '')
          return <h4 key={i} className="text-xs font-semibold text-gray-300 uppercase tracking-wider mt-3 mb-1">{clean}</h4>
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-brand-400 mt-1 shrink-0">&#8226;</span>
              <p className="text-xs text-gray-400 leading-relaxed">{trimmed.slice(2)}</p>
            </div>
          )
        }

        if (trimmed.match(/^\d+\./)) {
          return <p key={i} className="text-xs text-gray-400 leading-relaxed pl-1">{trimmed}</p>
        }

        if (trimmed.startsWith('_') && trimmed.endsWith('_')) {
          return <p key={i} className="text-[11px] text-gray-600 italic mt-2">{trimmed.replace(/_/g, '')}</p>
        }

        return <p key={i} className="text-xs text-gray-400 leading-relaxed">{trimmed}</p>
      })}
    </div>
  )
}
