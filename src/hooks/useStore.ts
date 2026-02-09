import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Store = Database['public']['Tables']['stores']['Row']

export function useStore(userId: string | undefined) {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStore = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('stores')
      .select('id, user_id, name, marketplace, api_key_enc, iv, created_at')
      .eq('user_id', userId)
      .maybeSingle()
    setStore(data as Store | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchStore()
  }, [fetchStore])

  const createStore = async (name: string, marketplace: string) => {
    if (!userId) return null
    const { data, error } = await supabase
      .from('stores')
      .insert({ user_id: userId, name, marketplace } as Database['public']['Tables']['stores']['Insert'])
      .select('id, user_id, name, marketplace, api_key_enc, iv, created_at')
      .maybeSingle()
    if (error) return null
    const storeData = data as Store | null
    setStore(storeData)
    return storeData
  }

  return { store, loading, createStore, refetch: fetchStore }
}
