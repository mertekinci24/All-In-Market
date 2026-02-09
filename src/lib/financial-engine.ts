import type { ProfitResult } from '@/types'

export interface ShippingRate {
  rate_type: 'desi' | 'price'
  min_value: number
  max_value: number
  cost: number
  vat_included: boolean
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

export function calculateProfit(input: ProfitInput): ProfitResult {
  const { salesPrice, buyPrice, commissionRate, vatRate, shippingCost, extraCost, adCost } = input

  const vatMultiplier = 1 + vatRate / 100
  const vat = salesPrice - salesPrice / vatMultiplier
  const commission = salesPrice * commissionRate
  const totalCost = buyPrice + vat + commission + shippingCost + extraCost + adCost
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
