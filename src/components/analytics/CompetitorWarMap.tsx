
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceDot
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { AlertTriangle, TrendingDown, Package, Crown } from 'lucide-react'

// Mock Data Interface (To be replaced with real data later)
interface WarMapPoint {
    date: string
    price: number
    competitor_price: number
    stock: number
    flags?: any[]
}

interface CompetitorWarMapProps {
    data?: WarMapPoint[]
}

const MOCK_DATA: WarMapPoint[] = [
    { date: '1 Şub', myPrice: 100, competitorPrice: 110, myStock: 50, marketAvg: 105, buyboxOwner: 'me' },
    { date: '3 Şub', myPrice: 100, competitorPrice: 105, myStock: 48, marketAvg: 102, buyboxOwner: 'me' },
    { date: '5 Şub', myPrice: 100, competitorPrice: 95, myStock: 45, marketAvg: 98, buyboxOwner: 'competitor', event: 'price_drop' },
    { date: '7 Şub', myPrice: 94, competitorPrice: 95, myStock: 42, marketAvg: 95, buyboxOwner: 'me', event: 'promotion' },
    { date: '9 Şub', myPrice: 94, competitorPrice: 90, myStock: 35, marketAvg: 92, buyboxOwner: 'competitor' },
    { date: '11 Şub', myPrice: 89, competitorPrice: 90, myStock: 30, marketAvg: 90, buyboxOwner: 'me' },
    { date: '13 Şub', myPrice: 89, competitorPrice: 85, myStock: 25, marketAvg: 88, buyboxOwner: 'competitor', event: 'price_drop' },
    { date: '15 Şub', myPrice: 85, competitorPrice: 85, myStock: 10, marketAvg: 85, buyboxOwner: 'me', event: 'stockout' }, // Critical Stock
]

export function CompetitorWarMap({ data = MOCK_DATA }: CompetitorWarMapProps) {

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload as WarMapPoint
            return (
                <div className="bg-surface-950 border border-white/10 p-3 rounded-lg shadow-xl text-xs space-y-1">
                    <p className="font-bold text-white mb-2 border-b border-white/10 pb-1">{label}</p>

                    <div className="flex items-center gap-2 text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>Bizim Fiyat:</span>
                        <span className="font-mono font-bold text-white">{point.price} TL</span>
                    </div>

                    <div className="flex items-center gap-2 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>Rakip (En Düşük):</span>
                        <span className="font-mono font-bold text-white">{point.competitor_price} TL</span>
                    </div>

                    <div className="flex items-center gap-2 text-green-400 mt-2">
                        <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                        <span>Stok Durumu:</span>
                        <span className="font-mono text-white">{point.stock} Adet</span>
                    </div>

                    <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                        {point.price <= point.competitor_price ? ( // Mock logic for now
                            <span className="text-yellow-500 flex items-center gap-1"><Crown className="h-3 w-3" /> Buybox Bizde</span>
                        ) : (
                            <span className="text-red-400">Buybox Kaybedildi</span>
                        )}
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <Card className="p-6 bg-surface-900 border-white/5 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Rakip Savaş Haritası</h3>
                    <p className="text-sm text-gray-400">Fiyat ve Stok değişimlerinin Buybox üzerindeki etkisi</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Bizim Fiyat
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        En Güçlü Rakip
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                        <Package className="h-3 w-3" />
                        Stok
                    </div>
                </div>
            </div>

            <div className="h-[400px] w-full bg-surface-950/30 rounded-xl border border-white/5 p-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} />

                        {/* Left Y-Axis: Price */}
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}₺`}
                            domain={['auto', 'auto']}
                        />

                        {/* Right Y-Axis: Stock */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#22c55e"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val} ad.`}
                        />

                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeDasharray: '4 4' }} />

                        {/* Data Series */}
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="stock"
                            stroke="#22c55e"
                            fillOpacity={1}
                            fill="url(#stockGradient)"
                            name="Stok"
                        />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="competitor_price"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={data.length === 1 ? { r: 4 } : false}
                            name="Rakip"
                        />

                        <Line
                            yAxisId="left"
                            type="stepAfter"
                            dataKey="price"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                if (!payload) return null;
                                if (payload.flags?.some((f: any) => f.type === 'price_war')) {
                                    return <TrendingDown key={props.key} x={cx - 10} y={cy - 10} className="text-red-500 h-5 w-5" />;
                                }
                                if (payload.flags?.some((f: any) => f.type === 'stockout')) {
                                    return <AlertTriangle key={props.key} x={cx - 10} y={cy - 20} className="text-yellow-500 h-5 w-5 animate-bounce" />;
                                }
                                if (payload.flags?.some((f: any) => f.type === 'buybox_won')) {
                                    return <circle key={props.key} cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
                                }
                                return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="none" />;
                            }}
                            name="Bizim Fiyat"
                        />

                        {/* Reference Lines for Context */}
                        <ReferenceLine yAxisId="left" y={data.length > 0 ? data[0].price * 1.1 : 0} label={{ value: 'Kritik Eşik', fill: '#6b7280', fontSize: 10 }} stroke="#6b7280" strokeDasharray="3 3" />
                    </ComposedChart>
                </ResponsiveContainer>

                {/* Overlay Badge for Status */}
                <div className="absolute top-4 right-4 bg-surface-900/90 backdrop-blur border border-white/10 p-3 rounded-lg shadow-lg">
                    <div className="text-xs text-gray-400 mb-1">Anlık Durum</div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-white font-medium">
                            {data.length > 0 && data[data.length - 1].price <= data[data.length - 1].competitor_price ? 'Rekabet Avantajı Yüksek' : 'Fiyat Dezavantajı'}
                        </span>
                    </div>
                </div>
            </div>

            {(() => {
                if (!data || data.length === 0) return null;
                const last = data[data.length - 1];
                const first = data[0];
                const priceChange = ((last.price - first.price) / first.price) * 100;
                const avgStock = Math.round(data.reduce((acc, curr) => acc + curr.stock, 0) / data.length);
                const buyboxWins = data.filter(d => d.flags?.some((f: any) => f.type === 'buybox_won')).length; // Mock logic if flags present
                // Since flags are simulated, let's use price comparison for buybox win rate
                const realBuyboxWins = data.filter(d => d.price <= d.competitor_price).length;
                const winRate = Math.round((realBuyboxWins / data.length) * 100);

                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-surface-950 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Buybox Kazanma Oranı</div>
                            <div className={`text-lg font-bold ${winRate > 50 ? 'text-green-400' : 'text-red-400'}`}>%{winRate}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-950 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Ortalama Stok</div>
                            <div className="text-lg font-bold text-white">{avgStock} Adet</div>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-950 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Stok Devir Hızı</div>
                            <div className="text-lg font-bold text-white">4.2 Gün</div> {/* Hardcoded for now as we lack sales data */}
                        </div>
                        <div className="p-3 rounded-lg bg-surface-950 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1">Fiyat Değişimi (30G)</div>
                            <div className={`text-lg font-bold flex items-center gap-1 ${priceChange < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {priceChange < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingDown className="h-4 w-4 rotate-180" />}
                                %{Math.abs(priceChange).toFixed(1)}
                            </div>
                        </div>
                    </div>
                )
            })()}
        </Card>
    )
}
