import { Zap, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { CampaignImpact } from '@/hooks/useAnalytics'
import { formatCurrency } from '@/lib/utils'

interface CampaignImpactCardProps {
    data: CampaignImpact[]
    campaignOrderRatio: number
}

export function CampaignImpactCard({ data, campaignOrderRatio }: CampaignImpactCardProps) {
    if (data.length === 0) {
        return (
            <Card>
                <CardHeader
                    title="Kampanya Etki Analizi"
                    action={
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                            <Zap className="h-4 w-4" />
                        </div>
                    }
                />
                <p className="py-8 text-center text-sm text-gray-500">Aktif kampanya verisi bulunamadı</p>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title="Kampanya Etki Analizi"
                subtitle="Seller share maliyeti ve kâr delta"
                action={
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                        <Zap className="h-4 w-4" />
                    </div>
                }
            />
            <div className="space-y-3">
                {/* Global ratio */}
                <div className="flex items-center gap-3 rounded-lg bg-surface-800/30 px-3 py-2 border border-white/5">
                    <Users className="h-4 w-4 text-brand-400 shrink-0" />
                    <div className="flex-1">
                        <span className="text-xs text-gray-400">Kampanyalı Sipariş Oranı</span>
                    </div>
                    <Badge variant={campaignOrderRatio > 50 ? 'success' : 'neutral'}>
                        %{campaignOrderRatio}
                    </Badge>
                </div>

                {/* Per-campaign cards */}
                {data.map((c) => {
                    const isDeltaPositive = c.profitDelta >= 0
                    return (
                        <div
                            key={c.campaignName + c.validFrom}
                            className="rounded-lg border border-white/5 bg-surface-800/20 p-3 space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5 text-success-400" />
                                    <span className="text-sm font-medium text-gray-200">{c.campaignName}</span>
                                </div>
                                <span className="text-[11px] text-gray-600">
                                    %{Math.round(c.campaignRate * 100)} komisyon
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-[10px] text-gray-600 uppercase">Sipariş</p>
                                    <p className="text-sm font-semibold text-gray-300">{c.campaignOrders}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-600 uppercase">Ciro</p>
                                    <p className="text-sm font-semibold text-gray-300 tabular-nums">{formatCurrency(c.campaignRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-600 uppercase">Kâr</p>
                                    <p className={`text-sm font-semibold tabular-nums ${c.campaignProfit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                                        {formatCurrency(c.campaignProfit)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-md bg-surface-900/50 px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-gray-500">Seller Pay:</span>
                                    <span className="text-[11px] font-medium text-warning-400">%{Math.round(c.sellerShare * 100)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {isDeltaPositive ? (
                                        <TrendingUp className="h-3 w-3 text-success-400" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 text-danger-400" />
                                    )}
                                    <span className={`text-xs font-semibold tabular-nums ${isDeltaPositive ? 'text-success-400' : 'text-danger-400'}`}>
                                        {isDeltaPositive ? '+' : ''}{formatCurrency(c.profitDelta)}/sipariş
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
