/**
 * Traffic Source Analytics Module
 * 
 * Provides logic to separate and analyze traffic sources for ASINs/Keywords.
 * Used in the "Deep Research" phase to estimate competitor traffic distribution.
 */

export interface TrafficInput {
    searchVolume: number
    clickShare: number // 0-1 (e.g., 0.15 for 15%)
    paidClicks: number // Estimated or actual paid clicks
    adImpressionShare?: number // 0-1
    ctr?: number // Click Through Rate (0-1)
    externalReferrals?: number // Known external hits
}

export interface TrafficBreakdown {
    organic: number
    paid: number
    external: number
    total: number
    organicRatio: number // 0-100
    paidRatio: number // 0-100
    externalRatio: number // 0-100
}

/**
 * Calculates estimated traffic breakdown based on search metrics.
 * 
 * Formula:
 * - Total Potential Clicks = Search Volume * Click Share
 * - Organic = Total Clicks - Paid Clicks (clamped to 0)
 * - Paid = Paid Clicks (or estimated from Ad Share * CTR)
 * - External = Provided value
 */
export function analyzeTrafficSource(input: TrafficInput): TrafficBreakdown {
    const {
        searchVolume,
        clickShare,
        paidClicks,
        adImpressionShare = 0,
        ctr = 0.02, // Default 2% CTR if not provided
        externalReferrals = 0
    } = input

    // Estimate Paid Traffic via Ad Share if paidClicks is not explicit
    // If paidClicks is provided, use it. Otherwise estimate.
    let estimatedPaid = paidClicks
    if (paidClicks === 0 && adImpressionShare > 0) {
        estimatedPaid = searchVolume * adImpressionShare * ctr
    }

    // Calculate Total Search Clicks (Organic + Paid from Search)
    // Note: Click Share usually accounts for Total Search Clicks in some tools (like SellerSprite),
    // but in others it might be organic only. We assume Click Share = Total Search Share.
    const totalSearchClicks = searchVolume * clickShare

    // Organic is the remainder after Paid is removed from Total Search Clicks
    let organic = totalSearchClicks - estimatedPaid

    // Safety clamp
    if (organic < 0) organic = 0

    const total = organic + estimatedPaid + externalReferrals

    // Avoid division by zero
    const safeTotal = total > 0 ? total : 1

    return {
        organic: Math.round(organic),
        paid: Math.round(estimatedPaid),
        external: Math.round(externalReferrals),
        total: Math.round(total),
        organicRatio: Math.round((organic / safeTotal) * 100),
        paidRatio: Math.round((estimatedPaid / safeTotal) * 100),
        externalRatio: Math.round((externalReferrals / safeTotal) * 100)
    }
}
