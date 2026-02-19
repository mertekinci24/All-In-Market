import { useMemo } from 'react'
import type { ProductWithProfit } from '@/hooks/useProducts'
import type { OrderWithItems } from '@/hooks/useOrders'
import type { CommissionSchedule } from '@/lib/financial-engine'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DailyTimeSeries {
    date: string          // YYYY-MM-DD
    label: string         // DD/MM
    revenue: number
    profit: number
    orderCount: number
}

export interface CategoryRollup {
    category: string
    revenue: number
    profit: number
    margin: number
    productCount: number
    avgReturnRate: number
}

export interface WorstProduct {
    id: string
    name: string
    netProfit: number
    margin: number
    returnRate: number
    salesPrice: number
}

export interface CampaignImpact {
    campaignName: string
    validFrom: string
    validUntil: string
    sellerShare: number
    marketplaceShare: number
    campaignRate: number
    normalRate: number
    /** Orders during campaign period */
    campaignOrders: number
    campaignRevenue: number
    campaignProfit: number
    /** Orders outside campaign period */
    normalOrders: number
    normalRevenue: number
    normalProfit: number
    /** Delta */
    profitDelta: number
}

export interface AnalyticsData {
    // Time-series (last 30 days)
    timeSeries: DailyTimeSeries[]

    // Category rollups
    categoryRollups: CategoryRollup[]

    // Top losers
    worstProducts: WorstProduct[]

    // KPIs
    totalOrderRevenue: number
    totalOrderProfit: number
    campaignOrderRatio: number
    avgOrderProfit: number

    // Campaign impact
    campaignImpacts: CampaignImpact[]
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAnalytics(
    products: ProductWithProfit[],
    orders: OrderWithItems[],
    schedules: CommissionSchedule[],
): AnalyticsData {

    /* ---------- Time-series: last 30 days ---------- */
    const timeSeries = useMemo(() => {
        const now = new Date()
        const days: DailyTimeSeries[] = []
        const ordersByDate = new Map<string, { revenue: number; profit: number; count: number }>()

        for (const o of orders) {
            const d = o.order_date?.slice(0, 10) ?? ''
            if (!d) continue
            const existing = ordersByDate.get(d) ?? { revenue: 0, profit: 0, count: 0 }
            ordersByDate.set(d, {
                revenue: existing.revenue + (o.total_amount ?? 0),
                profit: existing.profit + (o.total_profit ?? 0),
                count: existing.count + 1,
            })
        }

        for (let i = 29; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
            const data = ordersByDate.get(key) ?? { revenue: 0, profit: 0, count: 0 }
            days.push({
                date: key,
                label,
                revenue: Math.round(data.revenue * 100) / 100,
                profit: Math.round(data.profit * 100) / 100,
                orderCount: data.count,
            })
        }

        return days
    }, [orders])

    /* ---------- Category rollups ---------- */
    const categoryRollups = useMemo(() => {
        const catMap = new Map<string, { revenue: number; profit: number; count: number; returnRateSum: number }>()

        for (const p of products) {
            const cat = p.category || 'Diğer'
            const existing = catMap.get(cat) ?? { revenue: 0, profit: 0, count: 0, returnRateSum: 0 }
            catMap.set(cat, {
                revenue: existing.revenue + (p.sales_price ?? 0),
                profit: existing.profit + p.profit.netProfit,
                count: existing.count + 1,
                returnRateSum: existing.returnRateSum + (p.return_rate ?? 0),
            })
        }

        return Array.from(catMap.entries())
            .map(([category, d]) => ({
                category,
                revenue: Math.round(d.revenue * 100) / 100,
                profit: Math.round(d.profit * 100) / 100,
                margin: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 1000) / 10 : 0,
                productCount: d.count,
                avgReturnRate: d.count > 0 ? Math.round((d.returnRateSum / d.count) * 10) / 10 : 0,
            }))
            .sort((a, b) => b.revenue - a.revenue)
    }, [products])

    /* ---------- Worst products (top 5 losers) ---------- */
    const worstProducts = useMemo(() => {
        return [...products]
            .sort((a, b) => a.profit.netProfit - b.profit.netProfit)
            .slice(0, 5)
            .map((p) => ({
                id: p.id,
                name: p.name,
                netProfit: p.profit.netProfit,
                margin: p.profit.margin,
                returnRate: p.return_rate ?? 0,
                salesPrice: p.sales_price ?? 0,
            }))
    }, [products])

    /* ---------- KPIs ---------- */
    const { totalOrderRevenue, totalOrderProfit, campaignOrderRatio, avgOrderProfit } = useMemo(() => {
        let rev = 0
        let prof = 0
        let campaignCount = 0

        for (const o of orders) {
            rev += o.total_amount ?? 0
            prof += o.total_profit ?? 0
            if (o.campaign_name && o.campaign_name.trim() !== '') {
                campaignCount++
            }
        }

        return {
            totalOrderRevenue: Math.round(rev * 100) / 100,
            totalOrderProfit: Math.round(prof * 100) / 100,
            campaignOrderRatio: orders.length > 0 ? Math.round((campaignCount / orders.length) * 1000) / 10 : 0,
            avgOrderProfit: orders.length > 0 ? Math.round((prof / orders.length) * 100) / 100 : 0,
        }
    }, [orders])

    /* ---------- Campaign impact ---------- */
    const campaignImpacts = useMemo(() => {
        if (schedules.length === 0 || orders.length === 0) return []

        return schedules
            .filter((s) => s.is_active && s.campaign_name)
            .map((s) => {
                const from = new Date(s.valid_from)
                const until = new Date(s.valid_until)

                let campOrders = 0, campRevenue = 0, campProfit = 0
                let normOrders = 0, normRevenue = 0, normProfit = 0

                for (const o of orders) {
                    const oDate = new Date(o.order_date)
                    const rev = o.total_amount ?? 0
                    const prof = o.total_profit ?? 0

                    if (oDate >= from && oDate < until) {
                        campOrders++
                        campRevenue += rev
                        campProfit += prof
                    } else {
                        normOrders++
                        normRevenue += rev
                        normProfit += prof
                    }
                }

                const avgCampProfit = campOrders > 0 ? campProfit / campOrders : 0
                const avgNormProfit = normOrders > 0 ? normProfit / normOrders : 0

                return {
                    campaignName: s.campaign_name || 'İsimsiz',
                    validFrom: s.valid_from,
                    validUntil: s.valid_until,
                    sellerShare: s.seller_discount_share ?? 0,
                    marketplaceShare: s.marketplace_discount_share ?? 0,
                    campaignRate: s.campaign_rate,
                    normalRate: s.normal_rate,
                    campaignOrders: campOrders,
                    campaignRevenue: Math.round(campRevenue * 100) / 100,
                    campaignProfit: Math.round(campProfit * 100) / 100,
                    normalOrders: normOrders,
                    normalRevenue: Math.round(normRevenue * 100) / 100,
                    normalProfit: Math.round(normProfit * 100) / 100,
                    profitDelta: Math.round((avgCampProfit - avgNormProfit) * 100) / 100,
                }
            })
    }, [schedules, orders])

    return {
        timeSeries,
        categoryRollups,
        worstProducts,
        totalOrderRevenue,
        totalOrderProfit,
        campaignOrderRatio,
        avgOrderProfit,
        campaignImpacts,
    }
}
