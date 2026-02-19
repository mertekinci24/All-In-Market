import {
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, ReferenceArea, Legend,
} from 'recharts'
import { Card, CardHeader } from '@/components/ui/Card'
import type { DailyTimeSeries, CampaignImpact } from '@/hooks/useAnalytics'

const TOOLTIP_STYLE = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e2e8f0',
}

interface CampaignROIChartProps {
    timeSeries: DailyTimeSeries[]
    campaigns: CampaignImpact[]
}

export function CampaignROIChart({ timeSeries, campaigns }: CampaignROIChartProps) {
    if (timeSeries.length === 0) {
        return (
            <Card>
                <CardHeader title="Kampanya ROI Takvimi" subtitle="Günlük kâr + kampanya dönemleri" />
                <p className="py-8 text-center text-sm text-gray-500">Sipariş verisi bulunamadı</p>
            </Card>
        )
    }

    // Map campaign periods to chart index ranges
    const campaignBands = campaigns
        .map((c) => {
            const fromDate = c.validFrom.slice(0, 10)
            const untilDate = c.validUntil.slice(0, 10)
            const fromIdx = timeSeries.findIndex((t) => t.date >= fromDate)
            const untilIdx = timeSeries.findIndex((t) => t.date >= untilDate)
            if (fromIdx === -1) return null
            return {
                name: c.campaignName,
                x1: timeSeries[fromIdx]?.label ?? '',
                x2: untilIdx === -1 ? timeSeries[timeSeries.length - 1]?.label ?? '' : timeSeries[Math.max(0, untilIdx - 1)]?.label ?? '',
            }
        })
        .filter(Boolean) as { name: string; x1: string; x2: string }[]

    return (
        <Card>
            <CardHeader title="Kampanya ROI Takvimi" subtitle="Günlük kâr + kampanya dönemleri (yeşil bant)" />
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            interval={4}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                        />
                        <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(value: number | undefined, name: string | undefined) => {
                                if (name === 'Sipariş') return [value ?? 0, name]
                                return [`${(value ?? 0).toLocaleString('tr-TR')} TL`, name ?? '']
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingBottom: '8px' }}
                        />

                        {/* Campaign period overlay bands */}
                        {campaignBands.map((band, i) => (
                            <ReferenceArea
                                key={i}
                                x1={band.x1}
                                x2={band.x2}
                                fill="#00b26e"
                                fillOpacity={0.08}
                                stroke="#00b26e"
                                strokeOpacity={0.2}
                                strokeDasharray="3 3"
                                label={{
                                    value: band.name,
                                    position: 'insideTop',
                                    fill: '#00b26e',
                                    fontSize: 10,
                                    fontWeight: 500,
                                }}
                            />
                        ))}

                        <Bar
                            dataKey="revenue"
                            name="Ciro"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                            radius={[2, 2, 0, 0]}
                            barSize={8}
                            isAnimationActive
                            animationDuration={800}
                        />
                        <Line
                            type="monotone"
                            dataKey="profit"
                            name="Kâr"
                            stroke="#00b26e"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#00b26e', stroke: 'rgba(0,178,110,0.3)', strokeWidth: 4 }}
                            isAnimationActive
                            animationDuration={1000}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
