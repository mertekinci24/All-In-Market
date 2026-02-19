import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Calendar, AlertCircle } from 'lucide-react'

interface SeasonalityChartProps {
    forecastData?: { date: string; value: number; reason?: string }[]
    confidenceScore?: number
}

// Helper to format date
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(date)
}

export function SeasonalityChart({ forecastData, confidenceScore }: SeasonalityChartProps) {
    // If we have forecast data, use it. Otherwise fallback to mock or reviewDates logic
    let data = []

    if (forecastData && forecastData.length > 0) {
        data = forecastData.map(d => ({
            date: formatDate(d.date),
            value: d.value,
            fullDate: d.date,
            reason: d.reason
        }))
    } else {
        // Fallback or Empty state
        data = [
            { date: 'Pzt', value: 40 },
            { date: 'Sal', value: 30 },
            { date: 'Car', value: 20 },
            { date: 'Per', value: 27 },
            { date: 'Cum', value: 18 },
            { date: 'Cmt', value: 23 },
            { date: 'Paz', value: 34 },
        ]
    }

    return (
        <Card className="p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-brand-400" />
                        Mevsimsellik & Talep Tahmini
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Gelecek 30 gunluk satis ongoru grafigi
                    </p>
                </div>
                {confidenceScore !== undefined && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${confidenceScore >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        confidenceScore >= 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        <AlertCircle className="h-3.5 w-3.5" />
                        Guven Skoru: %{confidenceScore}
                    </div>
                )}
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            {/* Pattern for dotted/striped effect if needed, though strokeDasharray is usually enough */}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a1d24',
                                borderColor: '#ffffff10',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '0.5rem' }}
                        />
                        {/* 
                            For a "dotted line" future effect, typically we'd split data into "historical" and "forecast".
                            Since this specific chart represents a *forecast* (Task description: "Gelecek 30 gunluk..."),
                            we can style the whole line or part of it. 
                            If strictly forecast, we use a dashed line.
                        */}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="5 5" // Dotted effect for prediction
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-brand-500/5 blur-2xl" />
        </Card>
    )
}
