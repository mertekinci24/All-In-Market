import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { AnalyticsData } from '@/hooks/useAnalytics'

interface AdvisorResult {
    analysis: string
    fallback: boolean
    error?: string
}

const CACHE_KEY = 'allin_ai_advisor_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 saat
const COOLDOWN_MS = 30_000 // 30 saniye

interface CacheEntry {
    analysis: string
    fallback: boolean
    timestamp: number
    hash: string
}

/** Simple hash of analytics data to detect meaningful changes */
function dataHash(analytics: AnalyticsData, marketplace: string): string {
    const key = [
        marketplace,
        analytics.categoryRollups.length,
        Math.round(analytics.totalOrderRevenue),
        analytics.worstProducts.map((w) => w.id).join(','),
        analytics.campaignImpacts.length,
    ].join('|')
    return key
}

function getCache(hash: string): AdvisorResult | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const entry: CacheEntry = JSON.parse(raw)
        if (entry.hash !== hash) return null
        if (Date.now() - entry.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY)
            return null
        }
        return { analysis: entry.analysis, fallback: entry.fallback }
    } catch {
        return null
    }
}

function setCache(hash: string, result: AdvisorResult): void {
    try {
        const entry: CacheEntry = {
            analysis: result.analysis,
            fallback: result.fallback,
            timestamp: Date.now(),
            hash,
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
    } catch {
        // quota exceeded — silently skip
    }
}

export function useAiAdvisor() {
    const [result, setResult] = useState<AdvisorResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const lastCallRef = useRef(0)

    const analyze = useCallback(
        async (analytics: AnalyticsData, marketplace: string) => {
            // Cooldown check
            if (Date.now() - lastCallRef.current < COOLDOWN_MS) {
                setError('Lütfen 30 saniye bekleyin.')
                return
            }

            // Cache check
            const hash = dataHash(analytics, marketplace)
            const cached = getCache(hash)
            if (cached) {
                setResult(cached)
                return
            }

            setLoading(true)
            setError(null)
            setResult(null)
            lastCallRef.current = Date.now()

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                const token = session?.access_token

                if (!token) {
                    setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.')
                    setLoading(false)
                    return
                }

                const payload = {
                    categoryRollups: analytics.categoryRollups.map((c) => ({
                        category: c.category,
                        revenue: c.revenue,
                        profit: c.profit,
                        margin: c.margin,
                        productCount: c.productCount,
                        avgReturnRate: c.avgReturnRate,
                    })),
                    worstProducts: analytics.worstProducts,
                    campaignImpacts: analytics.campaignImpacts.map((c) => ({
                        campaignName: c.campaignName,
                        sellerShare: c.sellerShare,
                        marketplaceShare: c.marketplaceShare,
                        campaignOrders: c.campaignOrders,
                        campaignProfit: c.campaignProfit,
                        profitDelta: c.profitDelta,
                    })),
                    kpis: {
                        totalOrderRevenue: analytics.totalOrderRevenue,
                        totalOrderProfit: analytics.totalOrderProfit,
                        avgMargin:
                            analytics.categoryRollups.length > 0
                                ? Math.round(
                                    analytics.categoryRollups.reduce((s, c) => s + c.margin, 0) /
                                    analytics.categoryRollups.length,
                                )
                                : 0,
                        campaignOrderRatio: analytics.campaignOrderRatio,
                    },
                    marketplace,
                }

                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    },
                )

                const data = await res.json()

                if (!res.ok && !data.analysis) {
                    setError(data.error || 'AI analiz hatası')
                    setLoading(false)
                    return
                }

                const advisorResult: AdvisorResult = {
                    analysis: data.analysis,
                    fallback: data.fallback ?? false,
                    error: data.error,
                }

                setResult(advisorResult)
                setCache(hash, advisorResult)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Bağlantı hatası')
            } finally {
                setLoading(false)
            }
        },
        [],
    )

    const clearCache = useCallback(() => {
        localStorage.removeItem(CACHE_KEY)
        setResult(null)
    }, [])

    return { result, loading, error, analyze, clearCache }
}
