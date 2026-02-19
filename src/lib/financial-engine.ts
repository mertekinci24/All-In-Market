import type { ProfitResult } from '@/types'

export interface ShippingRate {
  rate_type: 'desi' | 'price'
  min_value: number
  max_value: number
  cost: number
  vat_included: boolean
}

export interface CommissionSchedule {
  id: string
  store_id: string
  product_id: string | null
  marketplace: string
  normal_rate: number
  campaign_rate: number
  campaign_name: string
  valid_from: string
  valid_until: string
  seller_discount_share: number
  marketplace_discount_share: number
  is_active: boolean
}

export interface CommissionResolution {
  rate: number
  campaignName: string | null
  isCampaignActive: boolean
  sellerDiscountShare: number
  marketplaceDiscountShare: number
}

export interface ProfitInput {
  salesPrice: number
  buyPrice: number
  commissionRate: number
  vatRate: number
  desi: number
  shippingCost: number
  extraCost: number
  adCost: number
  packagingCost?: number
  packagingVatIncluded?: boolean
  returnRate?: number
  serviceFee?: number
}

const FALLBACK_DESI_RATES: ShippingRate[] = [
  { rate_type: 'desi', min_value: 0, max_value: 1, cost: 9.99, vat_included: true },
  { rate_type: 'desi', min_value: 1, max_value: 2, cost: 11.99, vat_included: true },
  { rate_type: 'desi', min_value: 2, max_value: 3, cost: 13.99, vat_included: true },
  { rate_type: 'desi', min_value: 3, max_value: 5, cost: 17.99, vat_included: true },
  { rate_type: 'desi', min_value: 5, max_value: 10, cost: 24.99, vat_included: true },
  { rate_type: 'desi', min_value: 10, max_value: 15, cost: 34.99, vat_included: true },
  { rate_type: 'desi', min_value: 15, max_value: 20, cost: 44.99, vat_included: true },
  { rate_type: 'desi', min_value: 20, max_value: 30, cost: 59.99, vat_included: true },
]

export function resolveShippingCost(
  desi: number,
  salesPrice: number,
  rates: ShippingRate[],
): number {
  const desiRates = rates.filter((r) => r.rate_type === 'desi')
  const priceRates = rates.filter((r) => r.rate_type === 'price')

  const desiMatch = findMatchingRate(desiRates, desi)
  const priceMatch = findMatchingRate(priceRates, salesPrice)

  if (desiMatch !== null && priceMatch !== null) {
    return desiMatch
  }

  if (desiMatch !== null) return desiMatch
  if (priceMatch !== null) return priceMatch

  const fallbackMatch = findMatchingRate(FALLBACK_DESI_RATES, desi)
  return fallbackMatch ?? 9.99
}

function findMatchingRate(rates: ShippingRate[], value: number): number | null {
  if (rates.length === 0) return null

  const sorted = [...rates].sort((a, b) => a.min_value - b.min_value)
  for (const rate of sorted) {
    if (value >= rate.min_value && value < rate.max_value) {
      return rate.cost
    }
  }

  const last = sorted[sorted.length - 1]
  if (value >= last.min_value) {
    return last.cost
  }

  return null
}

export function getDesiShippingCost(desi: number, rates?: ShippingRate[]): number {
  const desiRates = rates
    ? rates.filter((r) => r.rate_type === 'desi')
    : FALLBACK_DESI_RATES

  const match = findMatchingRate(desiRates.length > 0 ? desiRates : FALLBACK_DESI_RATES, desi)
  return match ?? 9.99
}

/** Factor applied to return cost: covers outbound + return shipping */
const RETURN_SHIPPING_FACTOR = 2

export function calculateProfit(input: ProfitInput): ProfitResult {
  // Guard: sanitize all inputs — prevent NaN / negative / undefined propagation
  const safe = (v: number | undefined | null) => {
    const n = Number(v)
    return isNaN(n) || !isFinite(n) ? 0 : n
  }

  const salesPrice = Math.max(0, safe(input.salesPrice))
  const buyPrice = Math.max(0, safe(input.buyPrice))
  const commissionRate = Math.min(1, Math.max(0, safe(input.commissionRate)))
  const vatRate = Math.max(0, safe(input.vatRate))
  const shippingCost = Math.max(0, safe(input.shippingCost))
  const extraCost = Math.max(0, safe(input.extraCost))
  const adCost = Math.max(0, safe(input.adCost))
  const packagingCost = Math.max(0, safe(input.packagingCost))
  const packagingVatIncluded = input.packagingVatIncluded ?? true
  const returnRate = Math.min(100, Math.max(0, safe(input.returnRate)))
  const serviceFee = Math.max(0, safe(input.serviceFee))

  const vatMultiplier = 1 + vatRate / 100
  const vat = salesPrice - salesPrice / vatMultiplier
  const commission = salesPrice * commissionRate

  // Packaging: if VAT not included, add 20% KDV
  const packagingAdjusted = packagingVatIncluded
    ? packagingCost
    : packagingCost * 1.20

  // Return cost: expected loss from returns
  const returnCost = salesPrice * (returnRate / 100) * RETURN_SHIPPING_FACTOR

  const totalCost = buyPrice + vat + commission + shippingCost + extraCost + adCost
    + packagingAdjusted + serviceFee + returnCost

  const netProfit = salesPrice - totalCost
  const margin = salesPrice > 0 ? (netProfit / salesPrice) * 100 : 0
  const roi = buyPrice > 0 ? (netProfit / buyPrice) * 100 : 0

  return {
    salesPrice,
    buyPrice,
    vat: Math.round(vat * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    shippingCost,
    extraCost,
    adCost,
    packagingCost: Math.round(packagingAdjusted * 100) / 100,
    returnCost: Math.round(returnCost * 100) / 100,
    serviceFee,
    totalCost: Math.round(totalCost * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    margin: Math.round(margin * 10) / 10,
    roi: Math.round(roi * 10) / 10,
  }
}

export function simulatePriceChange(
  currentInput: ProfitInput,
  newSalesPrice: number,
): { current: ProfitResult; simulated: ProfitResult; profitDelta: number; marginDelta: number } {
  const current = calculateProfit(currentInput)
  const simulated = calculateProfit({ ...currentInput, salesPrice: newSalesPrice })
  return {
    current,
    simulated,
    profitDelta: simulated.netProfit - current.netProfit,
    marginDelta: simulated.margin - current.margin,
  }
}

export function resolveCommissionRate(
  productId: string | null,
  marketplace: string,
  schedules: CommissionSchedule[],
  fallbackRate: number,
  now: Date = new Date(),
): CommissionResolution {
  const activeSchedules = schedules.filter((s) => {
    if (!s.is_active) return false
    const from = new Date(s.valid_from)
    const until = new Date(s.valid_until)
    return now >= from && now < until && s.marketplace === marketplace
  })

  const productSpecific = activeSchedules.find((s) => s.product_id === productId)
  if (productSpecific) {
    return {
      rate: productSpecific.campaign_rate,
      campaignName: productSpecific.campaign_name || null,
      isCampaignActive: true,
      sellerDiscountShare: productSpecific.seller_discount_share,
      marketplaceDiscountShare: productSpecific.marketplace_discount_share,
    }
  }

  const storeWide = activeSchedules.find((s) => s.product_id === null)
  if (storeWide) {
    return {
      rate: storeWide.campaign_rate,
      campaignName: storeWide.campaign_name || null,
      isCampaignActive: true,
      sellerDiscountShare: storeWide.seller_discount_share,
      marketplaceDiscountShare: storeWide.marketplace_discount_share,
    }
  }

  return {
    rate: fallbackRate,
    campaignName: null,
    isCampaignActive: false,
    sellerDiscountShare: 1,
    marketplaceDiscountShare: 0,
  }
}
export interface ScoreInput {
  // Profitability
  netMargin: number
  roi: number

  // Demand
  estMonthlySales: number
  reviewVelocity: number // Used as proxy for Trend Momentum if specific trend data missing
  searchVolume: number

  // Competition
  reviewCount: number
  sellerCount: number // Market Density
  avgRating: number // Listing Quality proxy
  bsr: number // BSR Stability proxy (lower is better generally)

  // Operational
  returnRate?: number
  desi: number
}

export class OpportunityScoreEngine {
  private calculateSCurve(value: number, midpoint: number, steepness: number): number {
    return 1 / (1 + Math.exp(-steepness * (value - midpoint)))
  }

  private normalize(value: number, target: number, type: 'higher-better' | 'lower-better', sensitivity: number = 0.5): number {
    // Adjust steepness based on target magnitude
    const steepness = sensitivity / (target * 0.1 || 1)
    const curve = this.calculateSCurve(value, target, steepness)
    return type === 'higher-better' ? curve : 1 - curve
  }

  public calculate(input: ScoreInput) {
    let score = 0
    const details: Record<string, number> = {}

    // 1. Profitability (30%)
    // Net Margin (20%): Target 25%
    const scoreMargin = this.normalize(input.netMargin, 25, 'higher-better', 0.8) * 10
    score += scoreMargin * 0.20
    details['margin'] = scoreMargin

    // ROI (10%): Target 100%
    const scoreROI = this.normalize(input.roi, 100, 'higher-better', 0.5) * 10
    score += scoreROI * 0.10
    details['roi'] = scoreROI

    // 2. Demand (30%)
    // Est. Sales (15%): Target 300
    const scoreSales = this.normalize(input.estMonthlySales, 300, 'higher-better', 0.5) * 10
    score += scoreSales * 0.15
    details['sales'] = scoreSales

    // Trend (Review Velocity) (10%): Target 20/month (Positive momentum)
    const scoreTrend = this.normalize(input.reviewVelocity, 20, 'higher-better', 4) * 10
    score += scoreTrend * 0.10
    details['trend'] = scoreTrend

    // Search Volume (5%): Target 5000 (High Volume)
    const scoreVol = this.normalize(input.searchVolume, 5000, 'higher-better', 0.5) * 10
    score += scoreVol * 0.05
    details['volume'] = scoreVol

    // 3. Competition (30%)
    // Review Count (10%): Target < 50
    const scoreReviews = this.normalize(input.reviewCount, 50, 'lower-better', 0.5) * 10
    score += scoreReviews * 0.10
    details['reviews'] = scoreReviews

    // Market Density (Sellers) (10%): Target < 3 (Low Monopoly)
    const scoreDensity = this.normalize(input.sellerCount, 3, 'lower-better', 5) * 10
    score += scoreDensity * 0.10
    details['density'] = scoreDensity

    // Listing Quality (Rating) (5%): Target < 4.0 (Opportunity to beat) -> Actually if existing lists are bad (low rating), it's good for us.
    // "Low A+ Rate" implies we want "Low Quality Competitors".
    // So Normalized Rating: Lower is better for Opportunity.
    const scoreQuality = this.normalize(input.avgRating, 4.0, 'lower-better', 4) * 10
    score += scoreQuality * 0.05
    details['quality'] = scoreQuality

    // BSR (5%): Lower BSR is better generally (more stable sales often), but implies high competition.
    // However, for "Stability", we ideally want data variance.
    // Without variance data, we assume Lower BSR = Higher Comp = Lower Score?
    // User Guide: "BSR Stability - Low Fluctuation".
    // If we only have BSR snapshot, we make a simplified assumption:
    // If BSR is very high (>50k), it's unstable/low demand.
    // If BSR is very low (<100), it's hyper competitive.
    // Sweet spot is 1000-10000?
    // Let's simplified treat as: Lower BSR = Higher Demand (Good) but we already track Demand via Sales.
    // Let's use BSR here as "Competitor Strength". Strong BSR = Hard to Enter.
    // So Higher BSR = Better Opportunity (Easier to enter)? Or Lower?
    // "Opportunity Score" usually means "Is this a good product to LAUNCH?".
    // If competitors have High Sales (Low BSR), demand is proven.
    // But Complexity/Diffculty is high.
    // Let's stick to user prompt: "Competition... BSR Stability". 
    // Since we lack stability/history data in simple input, let's use BSR magnitude as proxy for "Entrenchment".
    // Low BSR (Rank 1) = Very Entrenched = Lower Opportunity Score (Harder).
    // Target BSR > 2000 implies "some room".
    const scoreBSR = this.normalize(input.bsr, 2000, 'higher-better', 0.5) * 10
    score += scoreBSR * 0.05
    details['bsr_score'] = scoreBSR

    // 4. Operational (10%)
    // Return Rate (5%): Target < 3%
    const rRate = input.returnRate ?? 2 // Default 2%
    const scoreReturn = this.normalize(rRate, 3, 'lower-better', 2) * 10
    score += scoreReturn * 0.05
    details['return_rate'] = scoreReturn

    // Logistics (Desi) (5%): Target < 2 (Small/Light)
    const scoreDesi = this.normalize(input.desi, 2, 'lower-better', 2) * 10
    score += scoreDesi * 0.05
    details['desi_score'] = scoreDesi

    return {
      total: Math.min(10, Math.max(1, Number(score.toFixed(1)))),
      details
    }
  }
}
