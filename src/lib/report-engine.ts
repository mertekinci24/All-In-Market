/**
 * Report Engine — Normalizes product + analytics data into report-ready structures.
 */

import type { ProductWithProfit } from '@/hooks/useProducts'
import type { AnalyticsData, CategoryRollup, WorstProduct } from '@/hooks/useAnalytics'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ReportMeta {
    storeName: string
    marketplace: string
    generatedAt: string
    productCount: number
}

export interface ReportKPI {
    totalRevenue: number
    totalProfit: number
    avgMargin: number
    avgRoi: number
    activeCount: number
    lossCount: number
}

export interface ReportProductRow {
    name: string
    category: string
    salesPrice: number
    buyPrice: number
    commission: number
    shipping: number
    packagingCost: number
    returnCost: number
    serviceFee: number
    netProfit: number
    margin: number
    roi: number
    returnRate: number
}

export interface ReportData {
    meta: ReportMeta
    kpi: ReportKPI
    categories: CategoryRollup[]
    worstProducts: WorstProduct[]
    products: ReportProductRow[]
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildReportData(
    products: ProductWithProfit[],
    analytics: AnalyticsData,
    storeName: string,
    marketplace: string,
): ReportData {
    const now = new Date()

    // KPI
    let totalRevenue = 0
    let totalProfit = 0
    let marginSum = 0
    let roiSum = 0
    let lossCount = 0

    const rows: ReportProductRow[] = products.map((p) => {
        totalRevenue += p.sales_price ?? 0
        totalProfit += p.profit.netProfit
        marginSum += p.profit.margin
        roiSum += p.profit.roi
        if (p.profit.netProfit < 0) lossCount++

        return {
            name: p.name,
            category: p.category || 'Diğer',
            salesPrice: p.sales_price ?? 0,
            buyPrice: p.profit.buyPrice,
            commission: p.profit.commission,
            shipping: p.profit.shippingCost,
            packagingCost: p.profit.packagingCost ?? 0,
            returnCost: p.profit.returnCost ?? 0,
            serviceFee: p.profit.serviceFee ?? 0,
            netProfit: p.profit.netProfit,
            margin: p.profit.margin,
            roi: p.profit.roi,
            returnRate: p.return_rate ?? 0,
        }
    })

    const n = products.length || 1

    return {
        meta: {
            storeName,
            marketplace,
            generatedAt: now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            productCount: products.length,
        },
        kpi: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            avgMargin: Math.round((marginSum / n) * 10) / 10,
            avgRoi: Math.round((roiSum / n) * 10) / 10,
            activeCount: products.filter((p) => p.stock_status === 'InStock').length,
            lossCount,
        },
        categories: analytics.categoryRollups,
        worstProducts: analytics.worstProducts.filter((w) => w.netProfit < 0),
        products: rows,
    }
}
