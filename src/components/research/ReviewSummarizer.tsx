import { Sparkles, BarChart } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface ReviewSummarizerProps {
    analysis: {
        summary: string
        sentiment: { pos: number; neg: number; neu: number }
        themes: string[]
        last_updated: string
    } | null
}

export function ReviewSummarizer({ analysis }: ReviewSummarizerProps) {
    if (!analysis) {
        return (
            <Card className="p-6 space-y-4 bg-surface-900/50 border-brand-500/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-800">
                        <Sparkles className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Yapay Zeka Analizi Bekleniyor</h3>
                        <p className="text-sm text-gray-400">Bu urun icin henuz analiz yapilmamis.</p>
                    </div>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                    <p className="text-sm text-blue-200">
                        🛒 <strong>Nasil Analiz Yapilir?</strong><br />
                        Trendyol urun sayfasina gidin ve Sky-Market uzantisini acarak <strong>"AI Raporu Olustur"</strong> butonuna tiklayin.
                    </p>
                </div>
            </Card>
        )
    }

    // Safe access with defaults
    const sentiment = analysis.sentiment || { pos: 0, neg: 0, neu: 0 };
    const themes = analysis.themes || [];
    const summary = analysis.summary || 'Analiz özeti mevcut değil.';

    return (
        <Card className="p-6 space-y-6 bg-surface-900/50 border-brand-500/20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-brand-500/10">
                        <Sparkles className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Yapay Zeka Yorum Analizi</h3>
                        <p className="text-xs text-brand-300">
                            Son Guncelleme: {analysis.last_updated ? new Date(analysis.last_updated).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6 animate-fade-in">
                {/* Sentiment Score */}
                <div className="flex items-center gap-4 bg-surface-950/50 p-4 rounded-xl border border-white/5">
                    <div className="text-center px-4 border-r border-white/10">
                        <div className={`text-2xl font-bold ${sentiment.pos > 70 ? 'text-green-400' : sentiment.pos > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            %{sentiment.pos}
                        </div>
                        <div className="text-xs text-gray-500">Pozitif</div>
                    </div>
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                        "{summary}"
                    </p>
                </div>

                {/* Themes */}
                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-blue-400">
                        <BarChart className="h-4 w-4" />
                        One Cikan Temalar
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {themes.length > 0 ? themes.map((theme, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-surface-800 text-xs text-gray-300 border border-white/10">
                                {theme}
                            </span>
                        )) : (
                            <span className="text-xs text-gray-500">Tema bulunamadi.</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500 mt-4 border-t border-white/5 pt-4">
                    <div>
                        <span className="block text-green-500 font-bold mb-1">%{sentiment.pos}</span>
                        Pozitif
                    </div>
                    <div>
                        <span className="block text-gray-400 font-bold mb-1">%{sentiment.neu}</span>
                        Notr
                    </div>
                    <div>
                        <span className="block text-red-500 font-bold mb-1">%{sentiment.neg}</span>
                        Negatif
                    </div>
                </div>
            </div>
        </Card>
    )
}
