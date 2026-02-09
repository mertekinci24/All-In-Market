import type { ProfitResult } from '@/types'

interface ProfitInput {
  salesPrice: number
  buyPrice: number
  commissionRate: number
  vatRate: number
  desi: number
  shippingCost: number
  extraCost: number
  adCost: number
}

const DESI_RATES: Record<string, number> = {
  '0-1': 9.99,
  '1-2': 11.99,
  '2-3': 13.99,
  '3-5': 17.99,
  '5-10': 24.99,
  '10-15': 34.99,
  '15-20': 44.99,
  '20-30': 59.99,
}

export function getDesiShippingCost(desi: number): number {
  if (desi <= 1) return DESI_RATES['0-1']
  if (desi <= 2) return DESI_RATES['1-2']
  if (desi <= 3) return DESI_RATES['2-3']
  if (desi <= 5) return DESI_RATES['3-5']
  if (desi <= 10) return DESI_RATES['5-10']
  if (desi <= 15) return DESI_RATES['10-15']
  if (desi <= 20) return DESI_RATES['15-20']
  return DESI_RATES['20-30']
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
  newSalesPrice: number
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
