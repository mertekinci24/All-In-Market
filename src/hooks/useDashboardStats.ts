import { useMemo } from 'react'
import type { ProductWithProfit } from './useProducts'

export function useDashboardStats(products: ProductWithProfit[]) {
  return useMemo(() => {
    if (products.length === 0) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        activeCount: products.length,
        lossCount: 0,
        avgMargin: 0,
        avgRoi: 0,
        profitableCount: 0,
        topProducts: [] as ProductWithProfit[],
        categorySummary: [] as { name: string; profit: number; count: number }[],
      }
    }

    const totalRevenue = products.reduce((sum, p) => sum + (p.sales_price ?? 0), 0)
    const totalProfit = products.reduce((sum, p) => sum + p.profit.netProfit, 0)
    const profitableCount = products.filter((p) => p.profit.netProfit >= 0).length
    const lossCount = products.filter((p) => p.profit.netProfit < 0).length
    const avgMargin =
      products.reduce((sum, p) => sum + p.profit.margin, 0) / products.length
    const avgRoi =
      products.reduce((sum, p) => sum + p.profit.roi, 0) / products.length

    const sorted = [...products].sort(
      (a, b) => Math.abs(b.profit.netProfit) - Math.abs(a.profit.netProfit)
    )
    const topProducts = sorted.slice(0, 5)

    const catMap = new Map<string, { profit: number; count: number }>()
    for (const p of products) {
      const cat = p.category || 'Diger'
      const existing = catMap.get(cat) ?? { profit: 0, count: 0 }
      catMap.set(cat, {
        profit: existing.profit + p.profit.netProfit,
        count: existing.count + 1,
      })
    }
    const categorySummary = Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.profit - a.profit)

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      activeCount: products.length,
      lossCount,
      avgMargin: Math.round(avgMargin * 10) / 10,
      avgRoi: Math.round(avgRoi * 10) / 10,
      profitableCount,
      topProducts,
      categorySummary,
    }
  }, [products])
}
