import React from 'react'
import { Brain, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import type { AnalyticsData } from '@/hooks/useAnalytics'
import type { useAiAdvisor } from '@/hooks/useAiAdvisor'

interface AiAdvisorPanelProps {
    analytics: AnalyticsData
    marketplace: string
    advisor: ReturnType<typeof useAiAdvisor>
}

/* -------- Simple markdown → JSX renderer -------- */
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let listItems: string[] = []
    let listKey = 0

    function flushList() {
        if (listItems.length === 0) return
        elements.push(
            <ul key={`list-${listKey++}`} className="space-y-1.5 pl-4 my-2">
                {listItems.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300 leading-relaxed list-disc">
                        <span dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
                    </li>
                ))}
            </ul>,
        )
        listItems = []
    }

    function inlineFmt(s: string): string {
        return s
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>')
            .replace(/`(.+?)`/g, '<code class="rounded bg-white/5 px-1 py-0.5 text-brand-400 text-xs">$1</code>')
            .replace(/\*(.+?)\*/g, '<em class="text-gray-400">$1</em>')
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (!line) {
            flushList()
            continue
        }

        // h3
        if (line.startsWith('### ')) {
            flushList()
            elements.push(
                <h3
                    key={`h3-${i}`}
                    className="mt-4 mb-2 text-sm font-bold text-gray-100 flex items-center gap-2"
                    dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(4)) }}
                />,
            )
            continue
        }

        // h2
        if (line.startsWith('## ')) {
            flushList()
            elements.push(
                <h2
                    key={`h2-${i}`}
                    className="mt-5 mb-2 text-base font-bold text-gray-50 border-b border-white/5 pb-1"
                    dangerouslySetInnerHTML={{ __html: inlineFmt(line.slice(3)) }}
                />,
            )
            continue
        }

        // list item
        if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.slice(2))
            continue
        }

        // numbered list
        if (/^\d+\.\s/.test(line)) {
            listItems.push(line.replace(/^\d+\.\s/, ''))
            continue
        }

        // paragraph / italic note
        flushList()
        if (line.startsWith('_') && line.endsWith('_')) {
            elements.push(
                <p key={`note-${i}`} className="mt-3 text-xs text-gray-600 italic">
                    {line.slice(1, -1)}
                </p>,
            )
        } else {
            elements.push(
                <p
                    key={`p-${i}`}
                    className="text-sm text-gray-300 leading-relaxed my-1"
                    dangerouslySetInnerHTML={{ __html: inlineFmt(line) }}
                />,
            )
        }
    }

    flushList()
    return <>{elements}</>
}

/* -------- Loading skeleton -------- */
function LoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-500/20" />
                <div className="h-4 w-48 rounded bg-white/5" />
            </div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                    <div className="h-3.5 w-40 rounded bg-white/5" />
                    <div className="h-3 w-full rounded bg-white/[0.03]" />
                    <div className="h-3 w-5/6 rounded bg-white/[0.03]" />
                    <div className="h-3 w-3/4 rounded bg-white/[0.03]" />
                </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-400 animate-spin-slow" />
                <span className="text-xs text-brand-400">Gemini analiz ediyor...</span>
            </div>
        </div>
    )
}

/* -------- Main component -------- */
export function AiAdvisorPanel({ analytics, marketplace, advisor }: AiAdvisorPanelProps) {
    const { result, loading, error, analyze, clearCache } = advisor
    const hasData = analytics.categoryRollups.length > 0

    return (
        <Card>
            <CardHeader
                title="AI Strateji Danışmanı"
                subtitle="Gemini 2.0 Flash ile portföy analizi"
                action={
                    <div className="flex items-center gap-2">
                        {result && (
                            <button
                                onClick={clearCache}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                                title="Cache temizle"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                            <Brain className="h-4 w-4" />
                        </div>
                    </div>
                }
            />

            {/* Initial state */}
            {!result && !loading && !error && (
                <div className="flex flex-col items-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-3">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Portföy verileriniz analiz edilmeye hazır</p>
                    <p className="text-[11px] text-gray-600 mb-4">
                        {hasData
                            ? `${analytics.categoryRollups.length} kategori, ${analytics.worstProducts.length} risk ürünü`
                            : 'Analiz için yeterli veri yok'}
                    </p>
                    <button
                        onClick={() => analyze(analytics, marketplace)}
                        disabled={!hasData || loading}
                        className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Brain className="h-4 w-4" />
                        Strateji Analizi Başlat
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && <LoadingSkeleton />}

            {/* Error */}
            {error && !loading && (
                <div className="flex items-start gap-3 rounded-lg bg-danger-500/5 border border-danger-500/10 p-3 my-2">
                    <AlertTriangle className="h-4 w-4 text-danger-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-danger-400 font-medium">{error}</p>
                        <button
                            onClick={() => analyze(analytics, marketplace)}
                            className="mt-2 text-xs text-gray-400 underline hover:text-gray-200"
                        >
                            Tekrar dene
                        </button>
                    </div>
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div>
                    {result.fallback && (
                        <div className="flex items-center gap-2 rounded-md bg-warning-500/5 border border-warning-500/10 px-3 py-1.5 mb-3">
                            <AlertTriangle className="h-3 w-3 text-warning-400" />
                            <span className="text-[11px] text-warning-400">
                                Kural tabanlı analiz — Gemini API yapılandırıldığında AI analiz aktif olacak
                            </span>
                        </div>
                    )}
                    <div className="max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                        {renderMarkdown(result.analysis)}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600">Sonuçlar 1 saat boyunca cache'lenir</span>
                        <button
                            onClick={() => { clearCache(); analyze(analytics, marketplace) }}
                            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand-400 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Yeniden analiz et
                        </button>
                    </div>
                </div>
            )}
        </Card>
    )
}
