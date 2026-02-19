import { useState, useRef, useEffect } from 'react'
import { FileDown, FileText, Table, ChevronDown, Loader2 } from 'lucide-react'
import type { ExportFormat } from '@/hooks/useExport'

interface ExportButtonProps {
    onExport: (format: ExportFormat) => void
    exporting: boolean
    error: string | null
}

export function ExportButton({ onExport, exporting, error }: ExportButtonProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-800/50 px-3 py-2 text-sm font-medium text-gray-300 transition-all hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileDown className="h-4 w-4" />
                )}
                {exporting ? 'Oluşturuluyor...' : 'Dışa Aktar'}
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {error && (
                <div className="absolute right-0 top-full mt-1 rounded-md bg-danger-500/10 border border-danger-500/20 px-2 py-1 text-[11px] text-danger-400 whitespace-nowrap z-50">
                    {error}
                </div>
            )}

            {open && !exporting && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-white/10 bg-surface-900 p-1 shadow-xl animate-fade-in">
                    <button
                        onClick={() => { onExport('pdf'); setOpen(false) }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-danger-500/10 text-danger-400">
                            <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium">PDF Raporu</p>
                            <p className="text-[10px] text-gray-500">Profesyonel tasarım</p>
                        </div>
                    </button>
                    <button
                        onClick={() => { onExport('excel'); setOpen(false) }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success-500/10 text-success-400">
                            <Table className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium">Excel Raporu</p>
                            <p className="text-[10px] text-gray-500">Filtrelenebilir, 3 sayfa</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    )
}
