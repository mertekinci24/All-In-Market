import { useEffect, useState, useCallback } from 'react'

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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/currency-rates`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Kur verisi alinamadi')
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
