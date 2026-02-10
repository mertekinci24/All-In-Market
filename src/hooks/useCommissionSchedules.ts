import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveCommissionRate } from '@/lib/financial-engine'
import type { CommissionSchedule, CommissionResolution } from '@/lib/financial-engine'
import type { Database } from '@/types/database'

type ScheduleRow = Database['public']['Tables']['commission_schedules']['Row']
type ScheduleInsert = Database['public']['Tables']['commission_schedules']['Insert']
type ScheduleUpdate = Database['public']['Tables']['commission_schedules']['Update']

const SCHEDULE_COLUMNS = 'id, store_id, product_id, marketplace, normal_rate, campaign_rate, campaign_name, valid_from, valid_until, seller_discount_share, marketplace_discount_share, is_active, created_at, updated_at'

function rowToSchedule(row: ScheduleRow): CommissionSchedule {
  return {
    id: row.id,
    store_id: row.store_id,
    product_id: row.product_id,
    marketplace: row.marketplace,
    normal_rate: row.normal_rate,
    campaign_rate: row.campaign_rate,
    campaign_name: row.campaign_name,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    seller_discount_share: row.seller_discount_share,
    marketplace_discount_share: row.marketplace_discount_share,
    is_active: row.is_active,
  }
}

export function useCommissionSchedules(storeId: string | undefined, marketplace: string) {
  const [schedules, setSchedules] = useState<CommissionSchedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedules = useCallback(async () => {
    if (!storeId) {
      setSchedules([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('commission_schedules')
      .select(SCHEDULE_COLUMNS)
      .eq('store_id', storeId)
      .eq('marketplace', marketplace)
      .order('valid_from', { ascending: true })

    const rows = (data ?? []) as ScheduleRow[]
    setSchedules(rows.map(rowToSchedule))
    setLoading(false)
  }, [storeId, marketplace])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const createSchedule = async (schedule: Omit<ScheduleInsert, 'store_id' | 'marketplace'>) => {
    if (!storeId) return null
    const insertData: ScheduleInsert = {
      ...schedule,
      store_id: storeId,
      marketplace,
    }
    const { data, error } = await supabase
      .from('commission_schedules')
      .insert(insertData)
      .select(SCHEDULE_COLUMNS)
      .maybeSingle()
    if (error || !data) return null
    const created = rowToSchedule(data as ScheduleRow)
    setSchedules((prev) => [...prev, created].sort((a, b) =>
      new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()
    ))
    return created
  }

  const updateSchedule = async (id: string, updates: ScheduleUpdate) => {
    const updateData: ScheduleUpdate = { ...updates, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('commission_schedules')
      .update(updateData)
      .eq('id', id)
      .select(SCHEDULE_COLUMNS)
      .maybeSingle()
    if (error || !data) return null
    const updated = rowToSchedule(data as ScheduleRow)
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from('commission_schedules').delete().eq('id', id)
    if (error) return false
    setSchedules((prev) => prev.filter((s) => s.id !== id))
    return true
  }

  const resolveCurrentRate = useCallback(
    (productId: string | null, fallbackRate: number): CommissionResolution => {
      return resolveCommissionRate(productId, marketplace, schedules, fallbackRate)
    },
    [marketplace, schedules]
  )

  const activeSchedules = useMemo(() => {
    const now = new Date()
    return schedules.filter((s) => {
      if (!s.is_active) return false
      const from = new Date(s.valid_from)
      const until = new Date(s.valid_until)
      return now >= from && now < until
    })
  }, [schedules])

  const upcomingSchedules = useMemo(() => {
    const now = new Date()
    return schedules
      .filter((s) => s.is_active && new Date(s.valid_from) > now)
      .sort((a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime())
  }, [schedules])

  const expiredSchedules = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return schedules
      .filter((s) => {
        const until = new Date(s.valid_until)
        return until < now && until >= thirtyDaysAgo
      })
      .sort((a, b) => new Date(b.valid_until).getTime() - new Date(a.valid_until).getTime())
  }, [schedules])

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    resolveCurrentRate,
    activeSchedules,
    upcomingSchedules,
    expiredSchedules,
    refetch: fetchSchedules,
  }
}
