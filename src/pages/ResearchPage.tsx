import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pickaxe, Search, BarChart2, Trash2, TrendingUp, ExternalLink, Plus, Brain, X, PieChart, Download, Swords, LayoutGrid, LayoutList } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useStore } from '@/hooks/useStore'
import { useProductMining, type ProductMining } from '@/hooks/useProductMining'
import { useAuth } from '@/hooks/useAuth'
import { ReviewSummarizer } from '@/components/research/ReviewSummarizer'
import { VariantAnalysisCard } from '@/components/research/VariantAnalysisCard'
import { SeasonalityChart } from '@/components/research/SeasonalityChart'
import { KeywordAnalysisTable } from '@/components/research/KeywordAnalysisTable'
import { OpportunityTable } from '@/components/research/OpportunityTable'
import { ScoreRadarChart } from '@/components/research/ScoreRadarChart'
import { CompetitorWarMap } from '@/components/analytics/CompetitorWarMap'
import { supabase } from '@/lib/supabase'

type ResearchTab = 'mining' | 'keywords' | 'traffic' | 'war-map'

export function ResearchPage() {
    const { user } = useAuth()
    const { store } = useStore(user?.id)
    const { researchItems, loading, deleteResearchItem } = useProductMining(store?.id)
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<ResearchTab>('mining')
    const [selectedProduct, setSelectedProduct] = useState<ProductMining | null>(null)
    const [selectedWarProduct, setSelectedWarProduct] = useState<ProductMining | null>(null)

    // Auto-select product from URL (Deep Link)
    useEffect(() => {
        const asinParam = searchParams.get('asin')
        if (asinParam) {
            console.log('[SKY] Dashboard opened with ASIN:', asinParam);
            if (researchItems.length > 0 && !selectedProduct) {
                const found = researchItems.find(p => p.asin === asinParam)
                if (found) {
                    console.log('[SKY] Auto-selecting product:', found.title);
                    setSelectedProduct(found)
                    // Clear param to clean URL (optional, but good UX)
                    // window.history.replaceState({}, '', '/research')
                } else {
                    console.warn('[SKY] ASIN not found in loaded research items yet.');
                }
            }
        }
    }, [searchParams, researchItems, selectedProduct])

    // Seasonality State

    // Seasonality State
    const [seasonalityData, setSeasonalityData] = useState<{
        forecast: { date: string; value: number; reason?: string }[],
        confidence: number,
        estSales: number
    } | null>(null)
    const [isForecastLoading, setIsForecastLoading] = useState(false)

    // War Map State
    const [warMapData, setWarMapData] = useState<any[]>([])
    const [warMapLoading, setWarMapLoading] = useState(false)

    // Fetch Seasonality Forecast when a product is selected
    useEffect(() => {
        if (selectedProduct) {
            fetchSeasonality(selectedProduct)
        } else {
            setSeasonalityData(null)
        }
    }, [selectedProduct])

    const fetchSeasonality = async (product: ProductMining) => {
        setIsForecastLoading(true)
        try {
            // Find best rank from keyword tracking if available
            const bestRank = product.keyword_tracking?.reduce((min, curr) =>
                (curr.rank && curr.rank < min) ? curr.rank : min, 10000) || 5000

            const { data, error } = await supabase.functions.invoke('predict-seasonality', {
                body: {
                    productId: (product as any).id,
                    title: (product as any).title,
                    price: (product as any).current_price,
                    category: 'General',
                    currentRank: bestRank,
                    reviewVelocity: 20 // Placeholder until we track velocity
                }
            })

            if (error) {
                console.error('Error from edge function:', error)
                return
            }

            if (data) {
                setSeasonalityData({
                    forecast: data.seasonality_forecast,
                    confidence: data.forecast_confidence,
                    estSales: data.est_monthly_sales
                })
            }
        } catch (e) {
            console.error('Error fetching seasonality:', e)
        } finally {
            setIsForecastLoading(false)
        }
    }

    type PriceSnapshot = {
        snapshot_date: string
        sales_price: number
        competitor_price: number | null
    }

    // Fetch War Map Data (Real or Simulated)
    const fetchWarMapData = async (product: ProductMining) => {
        setWarMapLoading(true)
        try {
            // 1. Try to find linked product ID in 'products' table
            const { data: linkedProduct } = await supabase
                .from('products')
                .select('id')
                .eq('external_id', product.asin)
                .maybeSingle()

            let transformed = []

            if (linkedProduct) {
                // 2. Fetch real snapshots if product exists
                const { data, error } = await supabase
                    .from('price_snapshots')
                    .select('*')
                    .eq('product_id', linkedProduct.id)
                    .order('snapshot_date', { ascending: true })

                if (!error && data && data.length > 0) {
                    const snapshots = data as unknown as PriceSnapshot[]
                    transformed = snapshots.map((s) => ({
                        date: new Date(s.snapshot_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                        price: s.sales_price,
                        stock: Math.floor(Math.random() * 50) + 10, // Mock stock until we track it
                        flags: [] as any[]
                    }))
                }
            }

            // 3. Fallback: If no historical data, use Current State
            if (transformed.length === 0 && product.current_price) {
                console.log('[SKY] Using current product state as initial War Map point')
                transformed.push({
                    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
                    price: product.current_price,
                    competitor_price: product.competitor_price || null,
                    stock: 0,
                    flags: [{ type: 'info', label: '📍 Güncel Durum' }]
                })
            }

            // Add calculated flags for real data (simulated already has them)
            if (linkedProduct && transformed.length > 0) {
                for (let i = 1; i < transformed.length; i++) {
                    const prev = transformed[i - 1]
                    const curr = transformed[i]

                    // Price War Logic
                    if (curr.price < prev.price * 0.9) {
                        curr.flags?.push({ type: 'price_war', label: '⚠️ Agresif Fiyat Düşüşü' })
                    }
                }
            }

            setWarMapData(transformed)

        } catch (e) {
            console.error('War Map Error:', e)
        } finally {
            setWarMapLoading(false)
        }
    }

    // Effect to load War Map when switching to tab if a product is selected
    useEffect(() => {
        if (activeTab === 'war-map' && selectedWarProduct) {
            fetchWarMapData(selectedWarProduct)
        }
    }, [activeTab, selectedWarProduct])

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table') // Default to table for pro feel

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Pickaxe className="h-6 w-6 text-brand-400" />
                        Urun Madenciligi & Istihbarat
                    </h1>
                    <p className="text-gray-400">Pazar analizi, firsat kesifi ve derinlemesine rakip istihbarati.</p>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-3">
                    {activeTab === 'mining' && (
                        <div className="flex bg-surface-900 border border-white/10 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-surface-800 text-brand-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Tablo Görünümü"
                            >
                                <LayoutList className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-surface-800 text-brand-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                title="Kart Görünümü"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            const headers = ['Baslik', 'Marka', 'Fiyat', 'Firsat Puani', 'ASIN', 'Link']
                            const rows = researchItems.map(item => [
                                item.title,
                                item.marketplace,
                                item.current_price,
                                item.opportunity_score,
                                item.asin,
                                `https://www.trendyol.com/dp/${item.asin}`
                            ])
                            const csvContent = [
                                headers.join(','),
                                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                            ].join('\n')

                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                            const link = document.createElement('a')
                            link.href = URL.createObjectURL(blob)
                            link.download = `pazar_arastirmasi_${new Date().toISOString().slice(0, 10)}.csv`
                            link.click()
                        }}
                        className="flex items-center gap-2 rounded-lg bg-surface-800 px-4 py-2 text-sm font-medium text-white hover:bg-surface-700 transition-colors border border-white/10"
                    >
                        <Download className="h-4 w-4" />
                        CSV Olarak Indir
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-1 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('mining')}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'mining'
                        ? 'text-brand-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Pickaxe className="h-4 w-4" />
                    Firsat Listesi
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-surface-800 px-2 py-0.5 text-xs text-gray-400">
                        {researchItems.length}
                    </span>
                    {activeTab === 'mining' && (
                        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500 animate-scale-in" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('war-map')}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'war-map'
                        ? 'text-red-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Swords className="h-4 w-4" />
                    Savas Haritasi
                    {activeTab === 'war-map' && (
                        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-red-500 animate-scale-in" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('keywords')}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'keywords'
                        ? 'text-brand-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Search className="h-4 w-4" />
                    Kelime Analizi
                    {activeTab === 'keywords' && (
                        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500 animate-scale-in" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('traffic')}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'traffic'
                        ? 'text-brand-400'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <BarChart2 className="h-4 w-4" />
                    Trafik Kaynaklari
                    {activeTab === 'traffic' && (
                        <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500 animate-scale-in" />
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-64 w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {activeTab === 'mining' && (
                            researchItems.length > 0 ? (
                                viewMode === 'table' ? (
                                    <div className="animate-slide-up">
                                        <OpportunityTable
                                            data={researchItems}
                                            onSelect={setSelectedProduct}
                                            onDelete={deleteResearchItem}
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
                                        {researchItems.map((item, index) => (
                                            <Card key={item.id} className="group relative flex flex-col overflow-hidden border-white/5 bg-surface-900/40 hover:bg-surface-900/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10" style={{ animationDelay: `${index * 50}ms` }}>
                                                {/* Image & Badge */}
                                                <div className="relative aspect-square w-full bg-surface-950">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-gray-700">
                                                            <Pickaxe className="h-12 w-12 opacity-20" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-3 right-3">
                                                        <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md shadow-lg ${item.opportunity_score >= 8 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                            item.opportunity_score >= 5 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                                            }`}>
                                                            <TrendingUp className="h-3 w-3" />
                                                            {item.opportunity_score}/10
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex flex-1 flex-col p-4">
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <h3 className="line-clamp-2 text-sm font-medium text-gray-200 leading-snug group-hover:text-brand-400 transition-colors">
                                                            {item.title}
                                                        </h3>
                                                    </div>

                                                    <div className="mt-auto space-y-3">
                                                        <div className="flex items-end justify-between border-t border-white/5 pt-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500">Satis Fiyati</p>
                                                                <p className="font-mono text-lg font-semibold text-white">
                                                                    {item.current_price?.toLocaleString('tr-TR')} <span className="text-xs font-normal text-gray-500">TL</span>
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500">ASIN</p>
                                                                <p className="font-mono text-xs text-brand-300">{item.asin}</p>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setSelectedProduct(item)}
                                                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-surface-800 py-2 text-xs font-medium text-gray-300 hover:bg-surface-700 hover:text-white transition-colors"
                                                            >
                                                                <PieChart className="h-3.5 w-3.5" />
                                                                Detayli Analiz
                                                            </button>
                                                            <button
                                                                onClick={() => deleteResearchItem(item.id)}
                                                                className="flex items-center justify-center rounded-lg bg-red-500/10 px-3 text-red-400 hover:bg-red-500/20 transition-colors"
                                                                title="Listeden Cikar"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="grid gap-6 animate-slide-up">
                                    <Card className="flex flex-col items-center justify-center py-16 text-center text-gray-500 border-dashed border-2 border-surface-700 bg-transparent">
                                        <div className="rounded-full bg-brand-500/10 p-4 mb-4">
                                            <Pickaxe className="h-10 w-10 text-brand-500" />
                                        </div>
                                        <h3 className="text-xl font-medium text-white mb-2">Henuz Bir Firsat Yakalanmadi</h3>
                                        <p className="max-w-md text-gray-400 mb-6">
                                            Trendyol veya Amazon urun sayfalarinda dolasirken Chrome Eklentisi uzerinden
                                            <span className="text-brand-400 font-medium"> "Analiz Et" </span> butonuna basarak potansiyel urunleri buraya ekleyebilirsiniz.
                                        </p>

                                        <div className="flex gap-4">
                                            <button className="flex items-center gap-2 rounded-lg bg-surface-800 px-4 py-2 text-sm font-medium text-white hover:bg-surface-700 transition-colors">
                                                <ExternalLink className="h-4 w-4" />
                                                Nasil Calisir?
                                            </button>
                                        </div>
                                    </Card>
                                </div>
                            )
                        )}

                        {activeTab === 'war-map' && (
                            <div className="grid gap-6 animate-slide-up">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    {/* Sidebar for Product Selection */}
                                    <Card className="p-4 space-y-4 h-fit">
                                        <h3 className="text-md font-medium text-white">Savasi Izlenecek Urun</h3>
                                        <div className="space-y-2">
                                            {researchItems.map(item => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSelectedWarProduct(item)}
                                                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${selectedWarProduct?.id === item.id
                                                        ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                                                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                                        }`}
                                                >
                                                    <div className="font-medium truncate">{item.title}</div>
                                                    <div className="flex justify-between mt-1 text-xs opacity-70">
                                                        <span>{item.asin}</span>
                                                        <span>{item.current_price} TL</span>
                                                    </div>
                                                </button>
                                            ))}
                                            {researchItems.length === 0 && (
                                                <p className="text-sm text-gray-500">Listenizde urun yok.</p>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Main Map */}
                                    <div className="lg:col-span-3">
                                        {selectedWarProduct ? (
                                            <div className="animate-in fade-in zoom-in duration-300">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                            <div className="w-2 h-8 bg-red-500 rounded-full"></div>
                                                            {selectedWarProduct.title}
                                                        </h2>
                                                        <p className="text-gray-400 text-sm ml-4">
                                                            ASIN: {selectedWarProduct.asin} • Fiyat Takibi ve Rekabet Analizi
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button className="px-3 py-1.5 rounded-lg bg-surface-800 text-xs text-gray-300 hover:bg-surface-700 transition-colors">30 Gün</button>
                                                        <button className="px-3 py-1.5 rounded-lg bg-surface-800 text-xs text-gray-300 hover:bg-surface-700 transition-colors">90 Gün</button>
                                                    </div>
                                                </div>
                                                {warMapLoading ? (
                                                    <Skeleton className="h-[400px] w-full rounded-xl" />
                                                ) : (
                                                    warMapData.length > 0 ? (
                                                        <CompetitorWarMap data={warMapData} />
                                                    ) : (
                                                        <Card className="h-[400px] flex items-center justify-center flex-col text-gray-500 border-dashed">
                                                            <Swords className="h-12 w-12 opacity-20 mb-4" />
                                                            <p>Bu urun icin henuz yeterli veri toplanmadi.</p>
                                                            <p className="text-xs mt-2">Eklenti uzerinden ziyaret ederek veri noktalari olusturabilirsiniz.</p>
                                                        </Card>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <Card className="h-[400px] flex items-center justify-center flex-col text-gray-500 border-dashed">
                                                <Swords className="h-12 w-12 opacity-20 mb-4" />
                                                <p>Savas haritasini gormek icin soldan bir urun secin.</p>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'keywords' && (
                            <div className="grid gap-6 animate-slide-up">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Search Box */}
                                    <Card className="lg:col-span-3 p-6 flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Rakip ASIN Analizi (Keyword Gap)</label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="ASIN veya Urun Linki yapistirin..."
                                                    className="w-full rounded-lg border border-white/10 bg-surface-950 pl-9 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <button className="h-[42px] px-6 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors flex items-center gap-2">
                                            <Brain className="h-4 w-4" />
                                            Analiz Et
                                        </button>
                                    </Card>

                                    <div className="lg:col-span-3">
                                        <h3 className="text-lg font-medium text-white mb-4">Takip Edilen Kelimeler</h3>
                                        {/* Flatten all keywords from all research items */}
                                        <KeywordAnalysisTable
                                            keywords={researchItems.flatMap(p =>
                                                (p.keyword_tracking || []).map(k => ({ ...k, productName: p.title }))
                                            )}
                                            showProduct={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'traffic' && (
                            <div className="grid gap-6 animate-slide-up">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-3 p-6 flex flex-col md:flex-row gap-4 items-end bg-surface-900/50">
                                        <div className="flex-1 w-full space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Trafik X-Ray (Kaynak Analizi)</label>
                                            <div className="relative">
                                                <BarChart2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Analiz edilecek ASIN..."
                                                    className="w-full rounded-lg border border-white/10 bg-surface-950 pl-9 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <button className="h-[42px] px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            Kaynaklari Getir
                                        </button>
                                    </Card>

                                    <Card className="flex flex-col items-center justify-center py-16 text-center text-gray-500 lg:col-span-3">
                                        <div className="rounded-full bg-blue-500/10 p-4 mb-4">
                                            <BarChart2 className="h-10 w-10 text-blue-500" />
                                        </div>
                                        <h3 className="text-xl font-medium text-white mb-2">Trafik X-Ray</h3>
                                        <p className="max-w-md text-gray-400">
                                            Organik (Arama), Reklam (Sponsorlu) ve Dis Trafik dagilimini gormek icin sorgulama yapin.
                                        </p>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-surface-900 border border-white/10 rounded-2xl shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-surface-900/95 px-6 py-4 backdrop-blur-xl">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Pickaxe className="h-5 w-5 text-brand-400" />
                                Detayli Pazar Analizi
                            </h2>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                                title="Kapat"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Product Header */}
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-surface-950">
                                    {selectedProduct.image_url ? (
                                        <img src={selectedProduct.image_url} alt={selectedProduct.title} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-gray-700">
                                            <Pickaxe className="h-8 w-8 opacity-20" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-medium text-white">{selectedProduct.title}</h3>
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                                        <span className="bg-surface-800 px-2 py-1 rounded-md text-xs">{selectedProduct.asin}</span>
                                        <span className="bg-surface-800 px-2 py-1 rounded-md text-xs">{selectedProduct.marketplace}</span>
                                    </div>
                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-white">{selectedProduct.current_price} TL</div>
                                            <div className="text-xs text-gray-500">Satis Fiyati</div>
                                        </div>
                                        <div className="h-8 w-px bg-white/10" />
                                        <div className="text-center">
                                            <div className={`text-xl font-bold ${selectedProduct.opportunity_score >= 8 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {selectedProduct.opportunity_score}/10
                                            </div>
                                            <div className="text-xs text-gray-500">Firsat Puani</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Score Analysis (New) */}
                                <Card className="p-6 space-y-4 bg-surface-900/50 border-brand-500/20">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Brain className="h-5 w-5 text-brand-400" />
                                        Fırsat Analizi (16 Boyutlu)
                                    </h3>

                                    {selectedProduct.ai_analysis?.insight && (
                                        <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl">
                                            <p className="text-sm text-brand-100 italic">
                                                "{selectedProduct.ai_analysis.insight}"
                                            </p>
                                        </div>
                                    )}

                                    <div className="h-[300px] w-full bg-surface-950/30 rounded-xl border border-white/5 p-2">
                                        <ScoreRadarChart details={selectedProduct.ai_analysis?.score_details} />
                                    </div>
                                </Card>

                                {/* Review Analysis */}
                                <div>
                                    <ReviewSummarizer analysis={selectedProduct.ai_analysis} />
                                </div>

                                {/* Variant Analysis */}
                                {selectedProduct.variant_analysis && selectedProduct.variant_analysis.length > 0 ? (
                                    <VariantAnalysisCard variants={selectedProduct.variant_analysis.map(v => ({ variantName: v.variant_name, reviewCount: v.review_count }))} totalMonthlySales={seasonalityData?.estSales || selectedProduct.market_metrics?.[0]?.est_monthly_sales || 0} />
                                ) : (
                                    <VariantAnalysisCard variants={[]} totalMonthlySales={seasonalityData?.estSales || 0} />
                                )}

                                {/* Seasonality */}
                                {isForecastLoading ? (
                                    <Skeleton className="h-[350px] w-full rounded-xl" />
                                ) : (
                                    <SeasonalityChart
                                        forecastData={seasonalityData?.forecast}
                                        confidenceScore={seasonalityData?.confidence}
                                    />
                                )}

                                {/* Keyword Tracking */}
                                <div className="md:col-span-2">
                                    <h4 className="text-md font-medium text-white mb-3 flex items-center gap-2">
                                        <Search className="h-4 w-4 text-brand-400" />
                                        Siralamadaki Kelimeler
                                    </h4>
                                    <KeywordAnalysisTable keywords={selectedProduct.keyword_tracking || []} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
