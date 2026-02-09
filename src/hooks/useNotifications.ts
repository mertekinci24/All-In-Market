import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notification_settings']['Row']
type NotificationUpdate = Database['public']['Tables']['notification_settings']['Update']

const COLUMNS = 'id, store_id, telegram_enabled, telegram_chat_id, telegram_bot_token, browser_enabled, notify_price_drop, notify_margin_warning, notify_stock_change, notify_competitor_change, margin_threshold, price_change_threshold, created_at, updated_at'

export function useNotifications(storeId: string | undefined) {
  const [settings, setSettings] = useState<NotificationRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const fetch = useCallback(async () => {
    if (!storeId) {
      setSettings(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notification_settings')
      .select(COLUMNS)
      .eq('store_id', storeId)
      .maybeSingle()
    setSettings(data as NotificationRow | null)
    setLoading(false)
  }, [storeId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const save = useCallback(async (updates: Partial<NotificationUpdate>) => {
    if (!storeId) return null
    setSaving(true)

    if (settings) {
      const { data, error } = await supabase
        .from('notification_settings')
        .update({ ...updates, updated_at: new Date().toISOString() } as NotificationUpdate)
        .eq('store_id', storeId)
        .select(COLUMNS)
        .maybeSingle()
      setSaving(false)
      if (error || !data) return null
      const row = data as NotificationRow
      setSettings(row)
      return row
    } else {
      const { data, error } = await supabase
        .from('notification_settings')
        .insert({ store_id: storeId, ...updates } as Database['public']['Tables']['notification_settings']['Insert'])
        .select(COLUMNS)
        .maybeSingle()
      setSaving(false)
      if (error || !data) return null
      const row = data as NotificationRow
      setSettings(row)
      return row
    }
  }, [storeId, settings])

  const testTelegram = useCallback(async (botToken: string, chatId: string) => {
    if (!storeId) return
    setTestingTelegram(true)
    setTestResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setTestResult({ ok: false, message: 'Oturum bulunamadi' })
        setTestingTelegram(false)
        return
      }

      const res = await window.fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'test',
            storeId,
            botToken,
            chatId,
          }),
        }
      )

      const data = await res.json()
      if (data.success) {
        setTestResult({ ok: true, message: 'Test mesaji gonderildi!' })
      } else {
        setTestResult({ ok: false, message: data.error || 'Gonderim basarisiz' })
      }
    } catch {
      setTestResult({ ok: false, message: 'Baglanti hatasi' })
    } finally {
      setTestingTelegram(false)
    }
  }, [storeId])

  const clearTestResult = useCallback(() => setTestResult(null), [])

  return {
    settings,
    loading,
    saving,
    testingTelegram,
    testResult,
    save,
    testTelegram,
    clearTestResult,
    refetch: fetch,
  }
}
