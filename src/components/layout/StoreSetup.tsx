import { useState } from 'react'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface StoreSetupProps {
  onCreateStore: (name: string, marketplace: string) => Promise<unknown>
}

const MARKETPLACES = [
  { value: 'trendyol', label: 'Trendyol' },
  { value: 'hepsiburada', label: 'Hepsiburada' },
  { value: 'amazon_tr', label: 'Amazon TR' },
]

export function StoreSetup({ onCreateStore }: StoreSetupProps) {
  const [name, setName] = useState('')
  const [marketplace, setMarketplace] = useState('trendyol')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Magaza adi zorunludur')
      return
    }
    setSaving(true)
    setError('')
    const result = await onCreateStore(name.trim(), marketplace)
    if (!result) {
      setError('Magaza olusturulamadi')
    }
    setSaving(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <Card className="w-full max-w-md animate-slide-up">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-3">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-gray-100">Magazanizi Olusturun</h1>
          <p className="mt-1 text-sm text-gray-500">Baslangic icin magaza bilgilerinizi girin</p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-danger-500/20 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Input
            label="Magaza Adi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Magazanizin adi"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Pazaryeri</label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/5 bg-surface-800/50 px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              {MARKETPLACES.map((mp) => (
                <option key={mp.value} value={mp.value}>{mp.label}</option>
              ))}
            </select>
          </div>
          <Button className="w-full mt-2" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Olusturuluyor...' : 'Magazayi Olustur'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
