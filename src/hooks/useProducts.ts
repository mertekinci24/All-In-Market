import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateProfit, resolveShippingCost, resolveCommissionRate } from '@/lib/financial-engine'
import type { ShippingRate, CommissionSchedule, CommissionResolution } from '@/lib/financial-engine'
import type { Database } from '@/types/database'
import type { ProfitResult } from '@/types'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductWithProfit extends ProductRow {
  profit: ProfitResult
  commissionResolution: CommissionResolution
}

function computeProfit(
  p: ProductRow,
  shippingRates: ShippingRate[],
  commissionSchedules: CommissionSchedule[],
  marketplace: string,
): { profit: ProfitResult; commissionResolution: CommissionResolution } {
  const salesPrice = p.sales_price ?? 0
  const shippingCost = p.shipping_cost > 0
    ? p.shipping_cost
    : resolveShippingCost(p.desi, salesPrice, shippingRates)

  const commissionResolution = resolveCommissionRate(
    p.id,
    marketplace,
    commissionSchedules,
    p.commission_rate
  )

  const profit = calculateProfit({
    salesPrice,
    buyPrice: p.buy_price,
    commissionRate: commissionResolution.rate,
    vatRate: p.vat_rate,
    desi: p.desi,
    shippingCost,
    extraCost: p.extra_cost,
    adCost: p.ad_cost,
    packagingCost: p.packaging_cost,
    packagingVatIncluded: p.packaging_vat_included,
    returnRate: p.return_rate,
    serviceFee: p.service_fee,
  })

  return { profit, commissionResolution }
}

const PRODUCT_COLUMNS = 'id, store_id, external_id, name, buy_price, sales_price, competitor_price, commission_rate, vat_rate, desi, shipping_cost, extra_cost, ad_cost, stock_status, image_url, category, marketplace_url, last_scraped, packaging_cost, packaging_vat_included, return_rate, logistics_type, service_fee, created_at, updated_at'

export function useProducts(
  storeId: string | undefined,
  shippingRates: ShippingRate[] = [],
  commissionSchedules: CommissionSchedule[] = [],
  marketplace: string = 'Trendyol',
) {
  const [rawProducts, setRawProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    if (!storeId) {
      setRawProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false })

    const rows = (data ?? []) as ProductRow[]
    setRawProducts(rows)
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Memoized enrichment - only recomputes when dependencies change
  const products = useMemo(() => {
    return rawProducts.map((p) => {
      const { profit, commissionResolution } = computeProfit(p, shippingRates, commissionSchedules, marketplace)
      return { ...p, profit, commissionResolution }
    })
  }, [rawProducts, shippingRates, commissionSchedules, marketplace])

  const addProduct = async (product: Omit<ProductInsert, 'store_id'>) => {
    if (!storeId) return null
    const insertData = { ...product, store_id: storeId } as ProductInsert
    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select(PRODUCT_COLUMNS)
      .maybeSingle()
    if (error || !data) return null
    const row = data as ProductRow
    setRawProducts((prev) => [row, ...prev])
    const { profit, commissionResolution } = computeProfit(row, shippingRates, commissionSchedules, marketplace)
    return { ...row, profit, commissionResolution }
  }

  const updateProduct = async (id: string, updates: ProductUpdate) => {
    const updateData = { ...updates, updated_at: new Date().toISOString() } as ProductUpdate
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(PRODUCT_COLUMNS)
      .maybeSingle()
    if (error || !data) return null
    const row = data as ProductRow
    setRawProducts((prev) => prev.map((p) => (p.id === id ? row : p)))
    const { profit, commissionResolution } = computeProfit(row, shippingRates, commissionSchedules, marketplace)
    return { ...row, profit, commissionResolution }
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return false
    setRawProducts((prev) => prev.filter((p) => p.id !== id))
    return true
  }

  return { products, loading, addProduct, updateProduct, deleteProduct, refetch: fetchProducts }
}
