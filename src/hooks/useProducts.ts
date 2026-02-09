import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateProfit, getDesiShippingCost } from '@/lib/financial-engine'
import type { Database } from '@/types/database'
import type { ProfitResult } from '@/types'

type ProductRow = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

export interface ProductWithProfit extends ProductRow {
  profit: ProfitResult
}

function computeProfit(p: ProductRow): ProfitResult {
  return calculateProfit({
    salesPrice: p.sales_price ?? 0,
    buyPrice: p.buy_price,
    commissionRate: p.commission_rate,
    vatRate: p.vat_rate,
    desi: p.desi,
    shippingCost: p.shipping_cost > 0 ? p.shipping_cost : getDesiShippingCost(p.desi),
    extraCost: p.extra_cost,
    adCost: p.ad_cost,
  })
}

const PRODUCT_COLUMNS = 'id, store_id, external_id, name, buy_price, sales_price, competitor_price, commission_rate, vat_rate, desi, shipping_cost, extra_cost, ad_cost, stock_status, image_url, category, marketplace_url, last_scraped, created_at, updated_at'

export function useProducts(storeId: string | undefined) {
  const [products, setProducts] = useState<ProductWithProfit[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    if (!storeId) {
      setProducts([])
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
    const enriched = rows.map((p) => ({
      ...p,
      profit: computeProfit(p),
    }))
    setProducts(enriched)
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
    const enriched: ProductWithProfit = { ...row, profit: computeProfit(row) }
    setProducts((prev) => [enriched, ...prev])
    return enriched
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
    const enriched: ProductWithProfit = { ...row, profit: computeProfit(row) }
    setProducts((prev) => prev.map((p) => (p.id === id ? enriched : p)))
    return enriched
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return false
    setProducts((prev) => prev.filter((p) => p.id !== id))
    return true
  }

  return { products, loading, addProduct, updateProduct, deleteProduct, refetch: fetchProducts }
}
