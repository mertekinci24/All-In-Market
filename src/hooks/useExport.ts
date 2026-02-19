import { useState, useCallback } from 'react'
import { saveAs } from 'file-saver'
import { buildReportData } from '@/lib/report-engine'
import { generatePDF } from '@/lib/pdf-generator'
import { generateExcel } from '@/lib/excel-generator'
import type { ProductWithProfit } from '@/hooks/useProducts'
import type { AnalyticsData } from '@/hooks/useAnalytics'

export type ExportFormat = 'pdf' | 'excel'

export function useExport() {
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const exportReport = useCallback(
        async (
            format: ExportFormat,
            products: ProductWithProfit[],
            analytics: AnalyticsData,
            storeName: string,
            marketplace: string,
        ) => {
            setExporting(true)
            setError(null)

            try {
                const data = buildReportData(products, analytics, storeName, marketplace)
                const dateStr = new Date().toISOString().slice(0, 10)
                const baseName = `AllIn_Rapor_${storeName.replace(/\s+/g, '_')}_${dateStr}`

                if (format === 'pdf') {
                    const blob = await generatePDF(data)
                    saveAs(blob, `${baseName}.pdf`)
                } else {
                    const blob = await generateExcel(data)
                    saveAs(blob, `${baseName}.xlsx`)
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Rapor oluşturulurken hata oluştu'
                setError(msg)
                console.error('Export error:', err)
            } finally {
                setExporting(false)
            }
        },
        [],
    )

    return { exportReport, exporting, error }
}
