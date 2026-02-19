/**
 * Review Analysis & Variant Estimation Logic
 * 
 * Used to estimate sales breakdown by product variant based on review distribution.
 * Also provides helpers for seasonality trend analysis.
 */

export interface VariantReviewData {
    variantName: string
    reviewCount: number
}

export interface VariantSalesEstimate {
    variantName: string
    reviewCount: number
    reviewShare: number // 0-100
    estimatedSales: number
}

/**
 * Estimates sales per variant based on review count distribution.
 * Assumption: Review count is proportional to sales volume.
 */
export function estimateVariantSales(
    variants: VariantReviewData[],
    totalMonthlySales: number
): VariantSalesEstimate[] {
    const totalReviews = variants.reduce((sum, v) => sum + v.reviewCount, 0)

    if (totalReviews === 0) {
        return variants.map(v => ({
            variantName: v.variantName,
            reviewCount: 0,
            reviewShare: 0,
            estimatedSales: 0
        }))
    }

    return variants.map(v => {
        const share = v.reviewCount / totalReviews
        return {
            variantName: v.variantName,
            reviewCount: v.reviewCount,
            reviewShare: Math.round(share * 10000) / 100, // 2 decimal places
            estimatedSales: Math.round(totalMonthlySales * share)
        }
    }).sort((a, b) => b.estimatedSales - a.estimatedSales)
}

/**
 * Aggregates review dates into monthly buckets for seasonality analysis.
 */
export function aggregateSeasonality(reviewDates: Date[]): { month: string; count: number }[] {
    const months: Record<string, number> = {}

    reviewDates.forEach(date => {
        const key = date.toISOString().slice(0, 7) // YYYY-MM
        months[key] = (months[key] || 0) + 1
    })

    return Object.entries(months)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
}
