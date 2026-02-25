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

  const fetchRates = useCallback(async (accessToken?: string | null) => {
    setLoading(true)
    setError(null)
    try {
      // V1.4.7: Use provided token if given, otherwise get fresh session.
      // currency-rates requires a valid user JWT — anon key alone is rejected (401).
      let bearerToken = accessToken
      if (!bearerToken) {
        const { data: { session } } = await supabase.auth.getSession()
        bearerToken = session?.access_token ?? null
      }

      if (!bearerToken) {
        // Not logged in yet — silently skip, will retry on auth state change (SIGNED_IN)
        setLoading(false)
        return
      }

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
    // Initial fetch (may be no-op if user not logged in yet)
    fetchRates()

    // V1.4.7: Re-fetch when user signs in — resolves 401 that occurs before session loads.
    // Supabase populates the session asynchronously; at component mount it may still be null.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchRates(session?.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchRates])

  return { rates, loading, error, refetch: () => fetchRates() }
}
