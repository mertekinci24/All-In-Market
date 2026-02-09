import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface ScenarioInput {
  name: string
  currentPrice: number
  targetPrice: number
  buyPrice: number
  commissionRate: number
  vatRate: number
  shippingCost: number
  competitorPrice: number | null
  category: string
  currentMargin: number
  currentRoi: number
  currentNetProfit: number
  simulatedMargin: number
  simulatedRoi: number
  simulatedNetProfit: number
  profitDelta: number
}

interface ScenarioResult {
  analysis: string
  fallback: boolean
  error?: string
}

export function useAiScenario() {
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (input: ScenarioInput) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('Oturum bulunamadi. Lutfen tekrar giris yapin.')
        setLoading(false)
        return
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-scenario`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      )

      const data = await res.json()

      if (!res.ok && !data.analysis) {
        setError(data.error || 'AI analiz hatasi')
        setLoading(false)
        return
      }

      setResult({
        analysis: data.analysis,
        fallback: data.fallback ?? false,
        error: data.error,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Baglanti hatasi')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, analyze, reset }
}
