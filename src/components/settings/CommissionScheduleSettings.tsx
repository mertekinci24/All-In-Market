import { useState, useEffect, useMemo } from 'react'
import {
    Timer, Plus, Zap, CalendarDays, CalendarClock, Trash2, Play, Pause,
    TrendingUp, Clock, ChevronDown, RotateCcw,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { calculateProfit } from '@/lib/financial-engine'
import type { CommissionSchedule } from '@/lib/financial-engine'
import type { ProductWithProfit } from '@/hooks/useProducts'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommissionScheduleSettingsProps {
    schedules: CommissionSchedule[]
    activeSchedules: CommissionSchedule[]
    upcomingSchedules: CommissionSchedule[]
    expiredSchedules: CommissionSchedule[]
    products: ProductWithProfit[]
    loading: boolean
    onCreate: (schedule: Omit<ScheduleInsertShape, 'store_id' | 'marketplace'>) => Promise<unknown>
    onUpdate: (id: string, updates: Partial<CommissionSchedule>) => Promise<unknown>
    onDelete: (id: string) => Promise<boolean>
}

type ScheduleInsertShape = {
    store_id: string
    marketplace: string
    campaign_name: string
    campaign_rate: number
    normal_rate: number
    valid_from: string
    valid_until: string
    seller_discount_share: number
    marketplace_discount_share: number
    product_id?: string | null
    is_active?: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCountdown(ms: number): string {
    if (ms <= 0) return '00:00:00'
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatRelativeTime(ms: number): string {
    if (ms <= 0) return 'Şimdi'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} gün`
    if (hours > 0) return `${hours} saat`
    const minutes = Math.floor(ms / (1000 * 60))
    return `${minutes} dk`
}

function toLocalInput(iso: string): string {
    const d = new Date(iso)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

/* ------------------------------------------------------------------ */
/*  Quick Templates                                                    */
/* ------------------------------------------------------------------ */

interface QuickTemplate {
    label: string
    icon: typeof Zap
    color: string
    apply: () => Partial<FormState>
}

interface FormState {
    campaign_name: string
    campaign_rate: string
    normal_rate: string
    valid_from: string
    valid_until: string
    seller_discount_share: string
    marketplace_discount_share: string
}

const INITIAL_FORM: FormState = {
    campaign_name: '',
    campaign_rate: '5',
    normal_rate: '15',
    valid_from: '',
    valid_until: '',
    seller_discount_share: '100',
    marketplace_discount_share: '0',
}

function getTemplates(): QuickTemplate[] {
    const now = new Date()

    return [
        {
            label: '2 Saatlik Flaş İndirim',
            icon: Zap,
            color: 'text-warning-400 bg-warning-500/10',
            apply: () => {
                const from = new Date(now)
                const until = new Date(now.getTime() + 2 * 60 * 60 * 1000)
                return {
                    campaign_name: 'Flaş İndirim',
                    campaign_rate: '5',
                    normal_rate: '15',
                    valid_from: toLocalInput(from.toISOString()),
                    valid_until: toLocalInput(until.toISOString()),
                    seller_discount_share: '100',
                    marketplace_discount_share: '0',
                }
            },
        },
        {
            label: 'Haftalık Kampanya',
            icon: CalendarDays,
            color: 'text-brand-400 bg-brand-500/10',
            apply: () => {
                const from = new Date(now)
                const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                return {
                    campaign_name: 'Haftalık Kampanya',
                    campaign_rate: '8',
                    normal_rate: '15',
                    valid_from: toLocalInput(from.toISOString()),
                    valid_until: toLocalInput(until.toISOString()),
                    seller_discount_share: '100',
                    marketplace_discount_share: '0',
                }
            },
        },
        {
            label: 'Ay Sonu Kampanya',
            icon: CalendarClock,
            color: 'text-blue-400 bg-blue-500/10',
            apply: () => {
                const from = new Date(now)
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                return {
                    campaign_name: 'Ay Sonu Kampanya',
                    campaign_rate: '10',
                    normal_rate: '15',
                    valid_from: toLocalInput(from.toISOString()),
                    valid_until: toLocalInput(endOfMonth.toISOString()),
                    seller_discount_share: '100',
                    marketplace_discount_share: '0',
                }
            },
        },
    ]
}

/* ------------------------------------------------------------------ */
/*  Countdown Timer Hook                                               */
/* ------------------------------------------------------------------ */

function useCountdown(targets: { id: string; until: string }[]): Map<string, number> {
    const [remaining, setRemaining] = useState<Map<string, number>>(new Map())

    useEffect(() => {
        if (targets.length === 0) {
            setRemaining(new Map())
            return
        }

        function tick() {
            const now = Date.now()
            const next = new Map<string, number>()
            for (const t of targets) {
                next.set(t.id, Math.max(0, new Date(t.until).getTime() - now))
            }
            setRemaining(next)
        }

        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [targets])

    return remaining
}

/* ------------------------------------------------------------------ */
/*  Profit Preview                                                     */
/* ------------------------------------------------------------------ */

function useProfitPreview(
    products: ProductWithProfit[],
    newRate: number,
): { avgMarginBefore: number; avgMarginAfter: number } | null {
    return useMemo(() => {
        if (products.length === 0 || isNaN(newRate)) return null
        const rateDecimal = newRate / 100

        let totalMarginBefore = 0
        let totalMarginAfter = 0
        let count = 0

        for (const p of products) {
            if (!p.sales_price || p.sales_price <= 0) continue
            totalMarginBefore += p.profit.margin

            const simulated = calculateProfit({
                salesPrice: p.sales_price,
                buyPrice: p.buy_price,
                commissionRate: rateDecimal,
                vatRate: p.vat_rate,
                desi: p.desi,
                shippingCost: p.profit.shippingCost,
                extraCost: p.extra_cost,
                adCost: p.ad_cost,
            })
            totalMarginAfter += simulated.margin
            count++
        }

        if (count === 0) return null
        return {
            avgMarginBefore: Math.round((totalMarginBefore / count) * 10) / 10,
            avgMarginAfter: Math.round((totalMarginAfter / count) * 10) / 10,
        }
    }, [products, newRate])
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CommissionScheduleSettings({
    activeSchedules,
    upcomingSchedules,
    expiredSchedules,
    products,
    loading,
    onCreate,
    onDelete,
}: CommissionScheduleSettingsProps) {
    const [form, setForm] = useState<FormState>(INITIAL_FORM)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [showExpired, setShowExpired] = useState(false)

    // Countdown hooks
    const activeTargets = useMemo(
        () => activeSchedules.map((s) => ({ id: s.id, until: s.valid_until })),
        [activeSchedules]
    )
    const remainingMap = useCountdown(activeTargets)

    // Profit preview
    const profitPreview = useProfitPreview(products, parseFloat(form.campaign_rate))

    const templates = useMemo(() => getTemplates(), [])

    const set = (field: keyof FormState, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }))

    const applyTemplate = (t: QuickTemplate) => {
        const values = t.apply()
        setForm((prev) => ({ ...prev, ...values }))
        setShowForm(true)
    }

    const handleCreate = async () => {
        if (!form.campaign_name.trim() || !form.valid_from || !form.valid_until) return
        setSaving(true)
        try {
            await onCreate({
                campaign_name: form.campaign_name,
                campaign_rate: parseFloat(form.campaign_rate) / 100,
                normal_rate: parseFloat(form.normal_rate) / 100,
                valid_from: new Date(form.valid_from).toISOString(),
                valid_until: new Date(form.valid_until).toISOString(),
                seller_discount_share: parseFloat(form.seller_discount_share) / 100,
                marketplace_discount_share: parseFloat(form.marketplace_discount_share) / 100,
                is_active: true,
            })
            setForm(INITIAL_FORM)
            setShowForm(false)
        } catch {
            // handled silently
        } finally {
            setSaving(false)
        }
    }

    const handleDeactivate = async (id: string) => {
        await onDelete(id)
    }

    if (loading) {
        return (
            <Card>
                <CardHeader
                    title="Kampanya Komisyon Yönetimi"
                    action={
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                            <Timer className="h-4 w-4" />
                        </div>
                    }
                />
                <div className="flex justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title="Kampanya Komisyon Yönetimi"
                subtitle="Zamanlı komisyon kampanyaları oluştur ve yönet"
                action={
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                        <Timer className="h-4 w-4" />
                    </div>
                }
            />

            {/* ── Quick Templates ───────────────────────────────────────── */}
            <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Hızlı Şablonlar</p>
                <div className="grid grid-cols-3 gap-2">
                    {templates.map((t) => (
                        <button
                            key={t.label}
                            onClick={() => applyTemplate(t)}
                            className="flex items-center gap-2 rounded-lg border border-white/5 bg-surface-800/40 px-3 py-2.5 text-left transition-all hover:border-white/10 hover:bg-surface-800/70 active:scale-[0.98]"
                        >
                            <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', t.color)}>
                                <t.icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-medium text-gray-300 leading-tight">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Active Campaigns ──────────────────────────────────────── */}
            {activeSchedules.length > 0 && (
                <div className="mb-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium text-success-400 uppercase tracking-wider">
                        <Play className="h-3 w-3" />
                        Aktif Kampanyalar ({activeSchedules.length})
                    </p>
                    <div className="space-y-2">
                        {activeSchedules.map((s) => {
                            const ms = remainingMap.get(s.id) ?? 0
                            return (
                                <div
                                    key={s.id}
                                    className="campaign-active flex items-center justify-between rounded-lg border border-success-500/20 bg-success-500/5 px-3 py-2.5 animate-fade-in"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-500/10">
                                            <Zap className="h-4 w-4 text-success-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-200 truncate">{s.campaign_name || 'Kampanya'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="success">%{Math.round(s.campaign_rate * 100)}</Badge>
                                                <span className="text-[11px] text-gray-500">
                                                    {formatDate(s.valid_from)} — {formatDate(s.valid_until)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Kalan Süre</p>
                                            <p className="text-sm font-mono font-semibold text-success-400 tabular-nums countdown-pulse">
                                                {formatCountdown(ms)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeactivate(s.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-danger-500/10 hover:text-danger-400"
                                            title="Kampanyayı Kaldır"
                                        >
                                            <Pause className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Upcoming Campaigns ────────────────────────────────────── */}
            {upcomingSchedules.length > 0 && (
                <div className="mb-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-400 uppercase tracking-wider">
                        <Clock className="h-3 w-3" />
                        Yaklaşan Kampanyalar ({upcomingSchedules.length})
                    </p>
                    <div className="space-y-2">
                        {upcomingSchedules.map((s) => {
                            const ms = Math.max(0, new Date(s.valid_from).getTime() - Date.now())
                            return (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-800/40 px-3 py-2.5 animate-fade-in"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                                            <CalendarDays className="h-4 w-4 text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-300 truncate">{s.campaign_name || 'Kampanya'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="neutral">%{Math.round(s.campaign_rate * 100)}</Badge>
                                                <span className="text-[11px] text-gray-500">{formatDate(s.valid_from)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            Başlamasına {formatRelativeTime(ms)}
                                        </Badge>
                                        <button
                                            onClick={() => handleDeactivate(s.id)}
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-danger-500/10 hover:text-danger-400"
                                            title="Sil"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Expired Campaigns ─────────────────────────────────────── */}
            {expiredSchedules.length > 0 && (
                <div className="mb-4">
                    <button
                        onClick={() => setShowExpired(!showExpired)}
                        className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
                    >
                        <ChevronDown className={cn('h-3 w-3 transition-transform', showExpired && 'rotate-180')} />
                        Süresi Dolan ({expiredSchedules.length})
                    </button>
                    {showExpired && (
                        <div className="space-y-2 animate-slide-up">
                            {expiredSchedules.map((s) => (
                                <div
                                    key={s.id}
                                    className="campaign-expired flex items-center justify-between rounded-lg border border-white/3 bg-surface-800/20 px-3 py-2 opacity-50"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                            <CalendarClock className="h-3.5 w-3.5 text-gray-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{s.campaign_name || 'Kampanya'}</p>
                                            <span className="text-[10px] text-gray-600">{formatDate(s.valid_until)} sona erdi</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="neutral">%{Math.round(s.campaign_rate * 100)}</Badge>
                                        <button
                                            onClick={() => {
                                                const now = new Date()
                                                const durationMs = new Date(s.valid_until).getTime() - new Date(s.valid_from).getTime()
                                                const until = new Date(now.getTime() + durationMs)
                                                setForm({
                                                    campaign_name: s.campaign_name,
                                                    campaign_rate: String(Math.round(s.campaign_rate * 100)),
                                                    normal_rate: String(Math.round(s.normal_rate * 100)),
                                                    valid_from: toLocalInput(now.toISOString()),
                                                    valid_until: toLocalInput(until.toISOString()),
                                                    seller_discount_share: String(Math.round(s.seller_discount_share * 100)),
                                                    marketplace_discount_share: String(Math.round(s.marketplace_discount_share * 100)),
                                                })
                                                setShowForm(true)
                                            }}
                                            className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-400"
                                            title="Yeniden Oluştur"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── New Campaign Form ─────────────────────────────────────── */}
            {!showForm ? (
                <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Yeni Kampanya
                </Button>
            ) : (
                <div className="rounded-lg border border-white/5 bg-surface-800/30 p-4 animate-slide-up">
                    <p className="mb-3 text-sm font-semibold text-gray-200">Yeni Kampanya Oluştur</p>

                    <div className="space-y-3">
                        <Input
                            label="Kampanya Adı"
                            value={form.campaign_name}
                            onChange={(e) => set('campaign_name', e.target.value)}
                            placeholder="Flash İndirim"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Kampanya Komisyonu (%)"
                                type="number"
                                value={form.campaign_rate}
                                onChange={(e) => set('campaign_rate', e.target.value)}
                                placeholder="5"
                            />
                            <Input
                                label="Normal Komisyon (%)"
                                type="number"
                                value={form.normal_rate}
                                onChange={(e) => set('normal_rate', e.target.value)}
                                placeholder="15"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Başlangıç"
                                type="datetime-local"
                                value={form.valid_from}
                                onChange={(e) => set('valid_from', e.target.value)}
                            />
                            <Input
                                label="Bitiş"
                                type="datetime-local"
                                value={form.valid_until}
                                onChange={(e) => set('valid_until', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Satıcı Payı (%)"
                                type="number"
                                value={form.seller_discount_share}
                                onChange={(e) => set('seller_discount_share', e.target.value)}
                                placeholder="100"
                            />
                            <Input
                                label="Pazaryeri Payı (%)"
                                type="number"
                                value={form.marketplace_discount_share}
                                onChange={(e) => set('marketplace_discount_share', e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        {/* Profit Preview */}
                        {profitPreview && (
                            <div className="flex items-center gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2 animate-fade-in">
                                <TrendingUp className="h-4 w-4 text-brand-400 shrink-0" />
                                <p className="text-xs text-gray-300">
                                    Bu kampanya ile ortalama kâr marjın{' '}
                                    <span className="font-semibold text-gray-400">%{profitPreview.avgMarginBefore}</span>
                                    {' → '}
                                    <span className="font-semibold text-success-400">%{profitPreview.avgMarginAfter}</span>
                                    {' '}seviyesine{' '}
                                    {profitPreview.avgMarginAfter > profitPreview.avgMarginBefore ? 'çıkacak' : 'düşecek'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setForm(INITIAL_FORM) }}>
                            İptal
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={saving || !form.campaign_name.trim() || !form.valid_from || !form.valid_until}
                        >
                            {saving ? 'Oluşturuluyor...' : 'Kampanyayı Oluştur'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Empty State ───────────────────────────────────────────── */}
            {activeSchedules.length === 0 && upcomingSchedules.length === 0 && expiredSchedules.length === 0 && !showForm && (
                <div className="mt-3 flex flex-col items-center py-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-3">
                        <Timer className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                        Henüz kampanya oluşturulmadı.<br />
                        Yukarıdaki hızlı şablonlardan birini seçerek başla.
                    </p>
                </div>
            )}
        </Card>
    )
}
