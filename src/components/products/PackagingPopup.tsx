import { useState, useCallback, useMemo } from 'react'
import { X, Plus, Trash2, PackageOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PackagingLineItem {
    id: string
    name: string
    unitCost: number
    quantity: number
    vatIncluded: boolean
}

interface PackagingPopupProps {
    open: boolean
    onClose: () => void
    onSave: (totalCost: number, vatIncluded: boolean) => void
    initialCost?: number
    initialVatIncluded?: boolean
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

const PRESETS: { label: string; item: Omit<PackagingLineItem, 'id'> }[] = [
    { label: 'Standart Koli (3.50 TL)', item: { name: 'Standart Koli', unitCost: 3.50, quantity: 1, vatIncluded: true } },
    { label: 'Fragile Paket (7.00 TL)', item: { name: 'Fragile Paket', unitCost: 7.00, quantity: 1, vatIncluded: true } },
    { label: 'Zarf (1.50 TL)', item: { name: 'Zarf', unitCost: 1.50, quantity: 1, vatIncluded: true } },
]

let nextId = 1
function uid() {
    return `pkg-${nextId++}-${Date.now()}`
}

function emptyItem(): PackagingLineItem {
    return { id: uid(), name: '', unitCost: 0, quantity: 1, vatIncluded: true }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PackagingPopup({ open, onClose, onSave, initialCost = 0, initialVatIncluded = true }: PackagingPopupProps) {
    const [items, setItems] = useState<PackagingLineItem[]>(() => {
        if (initialCost > 0) {
            return [{ id: uid(), name: 'Mevcut Paketleme', unitCost: initialCost, quantity: 1, vatIncluded: initialVatIncluded }]
        }
        return [emptyItem()]
    })

    const addItem = useCallback(() => {
        setItems((prev) => [...prev, emptyItem()])
    }, [])

    const addPreset = useCallback((preset: Omit<PackagingLineItem, 'id'>) => {
        setItems((prev) => [...prev, { ...preset, id: uid() }])
    }, [])

    const removeItem = useCallback((id: string) => {
        setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)))
    }, [])

    const updateItem = useCallback((id: string, field: keyof PackagingLineItem, value: string | number | boolean) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
        )
    }, [])

    const { totalCost, allVatIncluded } = useMemo(() => {
        let total = 0
        let allVat = true
        for (const item of items) {
            const lineCost = item.unitCost * item.quantity
            if (!item.vatIncluded) {
                total += lineCost * 1.20 // Add 20% KDV
                allVat = false
            } else {
                total += lineCost
            }
        }
        return { totalCost: Math.round(total * 100) / 100, allVatIncluded: allVat }
    }, [items])

    const handleSave = () => {
        onSave(totalCost, allVatIncluded)
        onClose()
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl animate-slide-up rounded-xl border border-white/5 bg-surface-900 p-5 shadow-2xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                            <PackageOpen className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-100">Paketleme Maliyeti</h2>
                            <p className="text-[11px] text-gray-500">Kalem bazında detaylı paketleme gideri</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Preset Buttons */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => addPreset(preset.item)}
                            className="flex items-center gap-1 rounded-md border border-white/5 bg-surface-800/50 px-2 py-1 text-[11px] text-gray-400 transition-all hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-300"
                        >
                            <Sparkles className="h-3 w-3" />
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Line Items */}
                <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className="flex items-end gap-2 rounded-lg border border-white/5 bg-surface-800/30 p-2.5 transition-colors hover:border-white/10"
                        >
                            <div className="flex-1 min-w-0">
                                <Input
                                    label={idx === 0 ? 'Kalem Adı' : ''}
                                    value={item.name}
                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                    placeholder="Koruyucu köşe kartonu"
                                />
                            </div>
                            <div className="w-20">
                                <Input
                                    label={idx === 0 ? 'Birim (TL)' : ''}
                                    type="number"
                                    value={item.unitCost || ''}
                                    onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="w-14">
                                <Input
                                    label={idx === 0 ? 'Adet' : ''}
                                    type="number"
                                    value={item.quantity || ''}
                                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                    placeholder="1"
                                />
                            </div>
                            <div className="flex flex-col items-center gap-0.5 pb-0.5">
                                {idx === 0 && (
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">KDV</span>
                                )}
                                <button
                                    onClick={() => updateItem(item.id, 'vatIncluded', !item.vatIncluded)}
                                    className={`flex h-7 w-12 items-center justify-center rounded-md border text-[10px] font-medium transition-all ${item.vatIncluded
                                            ? 'border-success-500/30 bg-success-500/10 text-success-400'
                                            : 'border-warning-500/30 bg-warning-500/10 text-warning-400'
                                        }`}
                                >
                                    {item.vatIncluded ? 'Dahil' : 'Hariç'}
                                </button>
                            </div>
                            <button
                                onClick={() => removeItem(item.id)}
                                disabled={items.length <= 1}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-danger-500/10 hover:text-danger-400 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Item */}
                <button
                    onClick={addItem}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-xs text-gray-500 transition-all hover:border-brand-500/30 hover:text-brand-400"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Kalem Ekle
                </button>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-800/50 px-3 py-2.5 border border-white/5">
                    <span className="text-sm font-medium text-gray-300">Toplam Paketleme</span>
                    <span className="text-lg font-semibold text-amber-400 tabular-nums">
                        {totalCost.toLocaleString('tr-TR')} TL
                    </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        İptal
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        Kaydet
                    </Button>
                </div>
            </div>
        </div>
    )
}
