import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type OrderRow = Database['public']['Tables']['orders']['Row']
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']
type OrderItemRow = Database['public']['Tables']['order_items']['Row']
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']

export interface OrderWithItems extends OrderRow {
  items: OrderItemRow[]
}

export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

const ORDER_COLUMNS = 'id, store_id, order_number, marketplace_order_id, order_date, total_amount, total_shipping, total_commission, total_profit, campaign_name, campaign_seller_share, campaign_marketplace_share, status, notes, created_at, updated_at'

export function useOrders(storeId: string | undefined) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!storeId) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: orderData } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('store_id', storeId)
      .order('order_date', { ascending: false })

    const rows = (orderData ?? []) as OrderRow[]

    if (rows.length === 0) {
      setOrders([])
      setLoading(false)
      return
    }

    const orderIds = rows.map((o) => o.id)
    const { data: itemData } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)

    const items = (itemData ?? []) as OrderItemRow[]
    const itemsByOrder = new Map<string, OrderItemRow[]>()
    items.forEach((item) => {
      const list = itemsByOrder.get(item.order_id) ?? []
      list.push(item)
      itemsByOrder.set(item.order_id, list)
    })

    const enriched: OrderWithItems[] = rows.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    }))

    setOrders(enriched)
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const addOrder = async (
    order: Omit<OrderInsert, 'store_id'>,
    items: Omit<OrderItemInsert, 'order_id'>[]
  ) => {
    if (!storeId) return null

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({ ...order, store_id: storeId } as OrderInsert)
      .select(ORDER_COLUMNS)
      .maybeSingle()

    if (orderError || !orderData) return null
    const newOrder = orderData as OrderRow

    let orderItems: OrderItemRow[] = []
    if (items.length > 0) {
      const itemsWithOrderId = items.map((item) => ({
        ...item,
        order_id: newOrder.id,
      })) as OrderItemInsert[]

      const { data: itemData } = await supabase
        .from('order_items')
        .insert(itemsWithOrderId)
        .select('*')

      orderItems = (itemData ?? []) as OrderItemRow[]
    }

    const enriched: OrderWithItems = { ...newOrder, items: orderItems }
    setOrders((prev) => [enriched, ...prev])
    return enriched
  }

  const updateOrder = async (
    id: string,
    updates: OrderUpdate,
    items?: Omit<OrderItemInsert, 'order_id'>[]
  ) => {
    const updateData = { ...updates, updated_at: new Date().toISOString() } as OrderUpdate
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select(ORDER_COLUMNS)
      .maybeSingle()

    if (orderError || !orderData) return null
    const updatedOrder = orderData as OrderRow

    let orderItems: OrderItemRow[] = []
    if (items !== undefined) {
      await supabase.from('order_items').delete().eq('order_id', id)

      if (items.length > 0) {
        const itemsWithOrderId = items.map((item) => ({
          ...item,
          order_id: id,
        })) as OrderItemInsert[]

        const { data: itemData } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId)
          .select('*')

        orderItems = (itemData ?? []) as OrderItemRow[]
      }
    } else {
      const existing = orders.find((o) => o.id === id)
      orderItems = existing?.items ?? []
    }

    const enriched: OrderWithItems = { ...updatedOrder, items: orderItems }
    setOrders((prev) => prev.map((o) => (o.id === id ? enriched : o)))
    return enriched
  }

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) return false
    setOrders((prev) => prev.filter((o) => o.id !== id))
    return true
  }

  return { orders, loading, addOrder, updateOrder, deleteOrder, refetch: fetchOrders }
}
