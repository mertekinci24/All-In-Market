import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts'

interface ScoreRadarChartProps {
    details?: Record<string, number>
}

export function ScoreRadarChart({ details }: ScoreRadarChartProps) {
    if (!details) return <div className="text-center text-gray-500 text-xs py-10">Detaylı puan verisi yok.</div>

    // Map backend keys to readable labels (16 Dimensions)
    const data = [
        // Profitability
        { subject: 'Kar Marji', A: details.margin || 0, fullMark: 10 },
        { subject: 'ROI', A: details.roi || 0, fullMark: 10 },
        { subject: 'Komisyon', A: details.commission || 0, fullMark: 10 },
        { subject: 'Ciro Potansiyeli', A: details.ticket_size || 0, fullMark: 10 },
        // Demand
        { subject: 'Satis Hacmi', A: details.sales || 0, fullMark: 10 },
        { subject: 'Trend', A: details.trend || 0, fullMark: 10 },
        { subject: 'Aranma', A: details.volume || 0, fullMark: 10 },
        { subject: 'Pazar Derinligi', A: details.market_depth || 0, fullMark: 10 },
        { subject: 'Pazarlama', A: details.marketing_potential || 0, fullMark: 10 },
        // Competition
        { subject: 'Rekabet (Yorum)', A: details.reviews || 0, fullMark: 10 },
        { subject: 'Rekabet (Satici)', A: details.density || 0, fullMark: 10 },
        { subject: 'Marka Tekeli', A: details.brand_dominance || 0, fullMark: 10 },
        // Risk & Ops
        { subject: 'Urun Kalitesi', A: details.quality || 0, fullMark: 10 },
        { subject: 'BSR', A: details.bsr_score || 0, fullMark: 10 },
        { subject: 'Iade Orani', A: details.return_rate || 0, fullMark: 10 },
        { subject: 'Lojistik', A: details.desi_score || 0, fullMark: 10 },
    ]

    return (
        <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar
                        name="Puan"
                        dataKey="A"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        itemStyle={{ color: '#8b5cf6' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
            <div className="absolute top-0 right-0 text-[10px] text-gray-500">
                * 10 üzerinden puanlanmistir
            </div>
        </div>
    )
}
