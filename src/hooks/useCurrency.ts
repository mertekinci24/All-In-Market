import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface CurrencyRates {
  USD: number
  EUR: number
  GBP: number
  CNY: number
  timestamp: string
  source: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useCurrency() {
  const [rates, setRates] = useState<CurrencyRates | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // V1.4.6: Supabase Edge Functions require BOTH:
      //   apikey: <anon_key>          — gateway authentication
      //   Authorization: Bearer <jwt> — user session (or anon if no session)
      // Sending only one of them causes a 401.
      const { data: { session } } = await supabase.auth.getSession()
      const bearerToken = session?.access_token ?? SUPABASE_ANON_KEY

      const res = await fetch(`${SUPABASE_URL}/functions/v1/currency-rates`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error(`Kur verisi alinamadi (${res.status})`)
      const data: CurrencyRates = await res.json()
      setRates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  return { rates, loading, error, refetch: fetchRates }
}
