export type Marketplace = 'trendyol' | 'hepsiburada' | 'amazon_tr'

export interface ProfitResult {
  salesPrice: number
  buyPrice: number
  vat: number
  commission: number
  shippingCost: number
  extraCost: number
  adCost: number
  totalCost: number
  netProfit: number
  margin: number
  roi: number
}

export interface DashboardStats {
  totalProducts: number
  totalRevenue: number
  totalProfit: number
  averageMargin: number
  profitableCount: number
  lossCount: number
}

export interface NavItem {
  label: string
  href: string
  icon: string
}
