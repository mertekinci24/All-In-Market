import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Banknote } from 'lucide-react'

interface ServiceFeeDefaults {
    trendyol: number
    hepsiburada: number
    amazon_tr: number
}

const MARKETPLACE_INFO: { key: keyof ServiceFeeDefaults; label: string; defaultFee: number }[] = [
    { key: 'trendyol', label: 'Trendyol', defaultFee: 2.50 },
    { key: 'hepsiburada', label: 'Hepsiburada', defaultFee: 2.00 },
    { key: 'amazon_tr', label: 'Amazon TR', defaultFee: 3.00 },
]

interface ServiceFeeSettingsProps {
    currentMarketplace: string
    currentFee: number
    onFeeChange?: (fee: number) => void
}

export function ServiceFeeSettings({ currentMarketplace, currentFee, onFeeChange }: ServiceFeeSettingsProps) {
    const [fees, setFees] = useState<ServiceFeeDefaults>(() => {
        const defaults: ServiceFeeDefaults = { trendyol: 2.50, hepsiburada: 2.00, amazon_tr: 3.00 }
        // Override current marketplace with actual fee
        const key = currentMarketplace.toLowerCase().replace(' ', '_') as keyof ServiceFeeDefaults
        if (key in defaults) {
            defaults[key] = currentFee || defaults[key]
        }
        return defaults
    })
    const [saved, setSaved] = useState(false)

    const handleFeeChange = (key: keyof ServiceFeeDefaults, value: number) => {
        setFees((prev) => ({ ...prev, [key]: value }))
        setSaved(false)
    }

    const handleSave = () => {
        const key = currentMarketplace.toLowerCase().replace(' ', '_') as keyof ServiceFeeDefaults
        if (onFeeChange && key in fees) {
            onFeeChange(fees[key])
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <Card>
            <CardHeader
                title="Hizmet Bedeli Ayarları"
                subtitle="Pazaryeri başına sabit hizmet bedeli"
                action={
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                        <Banknote className="h-4 w-4" />
                    </div>
                }
            />
            <div className="space-y-3">
                {MARKETPLACE_INFO.map(({ key, label, defaultFee }) => {
                    const isActive = currentMarketplace.toLowerCase().replace(' ', '_') === key
                    return (
                        <div
                            key={key}
                            className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${isActive ? 'bg-violet-500/5 border border-violet-500/20' : ''
                                }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-300">{label}</span>
                                    {isActive && (
                                        <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-400">
                                            Aktif
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-600">Varsayılan: {defaultFee.toFixed(2)} TL</span>
                            </div>
                            <div className="w-28">
                                <Input
                                    type="number"
                                    value={fees[key] || ''}
                                    onChange={(e) => handleFeeChange(key, parseFloat(e.target.value) || 0)}
                                    placeholder={defaultFee.toFixed(2)}
                                />
                            </div>
                        </div>
                    )
                })}
                <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-gray-600">
                        Hizmet bedeli her sipariş başına sabit ücrettir
                    </p>
                    <Button size="sm" onClick={handleSave}>
                        {saved ? '✓ Kaydedildi' : 'Uygula'}
                    </Button>
                </div>
            </div>
        </Card>
    )
}
