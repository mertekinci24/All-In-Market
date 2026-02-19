import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useToast } from '@/components/ui/Toast'

type ProductMiningRow = Database['public']['Tables']['product_mining']['Row']

export interface ProductMining extends Omit<ProductMiningRow, 'ai_analysis'> {
    ai_analysis: {
        last_updated?: string
        summary?: string
        sentiment?: { pos: number; neg: number; neu: number }
        themes?: string[]
        insight?: string
        score_details?: Record<string, number>
    } | null
    variant_analysis?: Database['public']['Tables']['variant_analysis']['Row'][]
    market_metrics?: Database['public']['Tables']['market_metrics']['Row'][]
    keyword_tracking?: Database['public']['Tables']['keyword_tracking']['Row'][]
}

export function useProductMining(storeId: string | undefined) {
    const [researchItems, setResearchItems] = useState<ProductMining[]>([])
    const [loading, setLoading] = useState(true)
    const { addToast } = useToast()

    const fetchResearch = useCallback(async () => {
        if (!storeId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('product_mining')
                .select('*, variant_analysis(*), market_metrics(*), keyword_tracking(*)')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })

            if (error) throw error

            setResearchItems((data as unknown as ProductMining[]) || [])
        } catch (err: any) {
            console.error('Error fetching research:', err)
            addToast('error', 'Arastirma verileri yuklenemedi.')
        } finally {
            setLoading(false)
        }
    }, [storeId, addToast])

    const deleteResearchItem = async (id: string) => {
        try {
            const { error } = await supabase
                .from('product_mining')
                .delete()
                .eq('id', id)

            if (error) throw error

            setResearchItems((prev) => prev.filter((item) => item.id !== id))
            addToast('success', 'Arastirma kaydi silindi.')
        } catch (err: any) {
            console.error('Error deleting research option:', err)
            addToast('error', 'Kayit silinemedi.')
        }
    }

    // Initial fetch
    useEffect(() => {
        fetchResearch()
    }, [fetchResearch])

    return {
        researchItems,
        loading,
        refetch: fetchResearch,
        deleteResearchItem,
    }
}
