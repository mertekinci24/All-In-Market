import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShippingRate } from '@/lib/financial-engine'

interface ShippingRateRow {
  id: string
  store_id: string | null
  marketplace: string
  rate_type: 'desi' | 'price'
  min_value: number
  max_value: number
  cost: number
  vat_included: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useShippingRates(storeId: string | undefined, marketplace: string) {
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [allRows, setAllRows] = useState<ShippingRateRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRates = useCallback(async () => {
    if (!storeId) {
      setRates([])
      setAllRows([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: systemDefaults } = await supabase
      .from('shipping_rates')
      .select('*')
      .is('store_id', null)
      .eq('marketplace', marketplace)
      .eq('is_active', true)
      .order('rate_type')
      .order('min_value')

    const { data: storeOverrides } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('store_id', storeId)
      .eq('marketplace', marketplace)
      .eq('is_active', true)
      .order('rate_type')
      .order('min_value')

    const defaults = (systemDefaults ?? []) as ShippingRateRow[]
    const overrides = (storeOverrides ?? []) as ShippingRateRow[]

    const merged = mergeRates(defaults, overrides)
    setAllRows([...defaults, ...overrides])
    setRates(merged)
    setLoading(false)
  }, [storeId, marketplace])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  const upsertRate = async (rate: Omit<ShippingRateRow, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('shipping_rates')
      .upsert(
        { ...rate, updated_at: new Date().toISOString() },
        { onConflict: 'store_id,marketplace,rate_type,min_value' }
      )
      .select()
      .maybeSingle()

    if (!error) await fetchRates()
    return { data, error }
  }

  const deleteStoreRate = async (id: string) => {
    const { error } = await supabase
      .from('shipping_rates')
      .delete()
      .eq('id', id)

    if (!error) await fetchRates()
    return !error
  }

  const resetToDefaults = async () => {
    if (!storeId) return false

    const { error } = await supabase
      .from('shipping_rates')
      .delete()
      .eq('store_id', storeId)
      .eq('marketplace', marketplace)

    if (!error) await fetchRates()
    return !error
  }

  return {
    rates,
    allRows,
    loading,
    upsertRate,
    deleteStoreRate,
    resetToDefaults,
    refetch: fetchRates,
    hasCustomRates: allRows.some((r) => r.store_id !== null),
  }
}

function mergeRates(defaults: ShippingRateRow[], overrides: ShippingRateRow[]): ShippingRate[] {
  const overrideMap = new Map<string, ShippingRateRow>()
  for (const o of overrides) {
    overrideMap.set(`${o.rate_type}:${o.min_value}`, o)
  }

  const merged = new Map<string, ShippingRate>()

  for (const d of defaults) {
    const key = `${d.rate_type}:${d.min_value}`
    const override = overrideMap.get(key)
    const source = override ?? d
    merged.set(key, {
      rate_type: source.rate_type,
      min_value: source.min_value,
      max_value: source.max_value,
      cost: source.cost,
      vat_included: source.vat_included,
    })
  }

  for (const o of overrides) {
    const key = `${o.rate_type}:${o.min_value}`
    if (!merged.has(key)) {
      merged.set(key, {
        rate_type: o.rate_type,
        min_value: o.min_value,
        max_value: o.max_value,
        cost: o.cost,
        vat_included: o.vat_included,
      })
    }
  }

  return Array.from(merged.values())
}
