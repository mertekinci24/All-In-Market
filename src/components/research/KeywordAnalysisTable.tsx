import { ArrowUp, ArrowDown, Minus, Search, ExternalLink } from 'lucide-react'
import type { Database } from '@/types/database'

type KeywordTracking = Database['public']['Tables']['keyword_tracking']['Row']

interface KeywordAnalysisTableProps {
    keywords: (KeywordTracking & { productName?: string })[]
    showProduct?: boolean
}

export function KeywordAnalysisTable({ keywords, showProduct = false }: KeywordAnalysisTableProps) {
    if (!keywords || keywords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 bg-surface-900/40 rounded-xl border border-white/5">
                <Search className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Henuz takip edilen kelime yok.</p>
                <p className="text-xs text-gray-600 mt-1">SERP taramasi yapildiginda veriler buraya eklenecektir.</p>
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-900/40">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-white/5 bg-surface-900/60 text-xs font-medium text-gray-400">
                        {showProduct && <th className="px-4 py-3">Urun</th>}
                        <th className="px-4 py-3">Kelime</th>
                        <th className="px-4 py-3 text-right">Sira</th>
                        <th className="px-4 py-3 text-right">Hacim (Tahmini)</th>
                        <th className="px-4 py-3 text-right">Durum</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {keywords.map((k) => (
                        <tr key={k.id} className="group hover:bg-white/5 transition-colors">
                            {showProduct && (
                                <td className="px-4 py-3 font-medium text-gray-300">
                                    {k.productName}
                                </td>
                            )}
                            <td className="px-4 py-3 font-medium text-gray-200">
                                <div className="flex items-center gap-2">
                                    <span className="bg-surface-800 px-1.5 py-0.5 rounded text-xs text-brand-400 font-mono">
                                        #{k.rank ?? '-'}
                                    </span>
                                    {k.keyword}
                                    <a
                                        href={`https://www.trendyol.com/sr?q=${encodeURIComponent(k.keyword)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
                                        title="Trendyol'da Ara"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {k.rank && k.rank <= 3 ? (
                                        <ArrowUp className="h-3 w-3 text-green-500" />
                                    ) : k.rank && k.rank <= 10 ? (
                                        <Minus className="h-3 w-3 text-yellow-500" />
                                    ) : (
                                        <ArrowDown className="h-3 w-3 text-red-500" />
                                    )}
                                    <span className={k.rank && k.rank <= 3 ? 'text-green-400 font-bold' : 'text-gray-300'}>
                                        {k.rank ?? 'Bulunamadi'}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-400">
                                {k.search_volume_est?.toLocaleString() ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {k.is_indexed ? (
                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                                        Indekslendi
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                                        Indeks Yok
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
