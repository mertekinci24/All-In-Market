import { Header } from '@/components/layout/Header'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TelegramSettings } from '@/components/settings/TelegramSettings'
import { BrowserNotifSettings } from '@/components/settings/BrowserNotifSettings'
import { AlertPreferences } from '@/components/settings/AlertPreferences'
import { ShippingBaremSettings } from '@/components/settings/ShippingBaremSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { Shield, Store, Key } from 'lucide-react'
import type { Database } from '@/types/database'

type StoreRow = Database['public']['Tables']['stores']['Row']

interface SettingsPageProps {
  store: StoreRow
  shippingRates: unknown[]
  storeId: string
  marketplace: string
}

const MARKETPLACE_LABELS: Record<string, string> = {
  trendyol: 'Trendyol',
  hepsiburada: 'Hepsiburada',
  amazon_tr: 'Amazon TR',
}

export function SettingsPage({ store, storeId, marketplace }: SettingsPageProps) {
  const {
    settings: notifSettings,
    loading: notifLoading,
    saving,
    testingTelegram,
    testResult,
    save: saveNotif,
    testTelegram,
    clearTestResult,
  } = useNotifications(store.id)

  return (
    <div className="animate-fade-in">
      <Header title="Ayarlar" subtitle="Hesap, magaza, kargo ve bildirim ayarlari" />
      <div className="max-w-2xl space-y-5 p-6">
        <Card>
          <CardHeader
            title="Magaza Bilgileri"
            action={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                <Store className="h-4 w-4" />
              </div>
            }
          />
          <div className="space-y-3">
            <Input label="Magaza Adi" value={store.name} disabled />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pazaryeri" value={MARKETPLACE_LABELS[store.marketplace] ?? store.marketplace} disabled />
              <Input label="Magaza ID" value={store.id.slice(0, 8) + '...'} disabled />
            </div>
          </div>
        </Card>

        <ShippingBaremSettings storeId={storeId} marketplace={marketplace} />

        <Card>
          <CardHeader
            title="API Anahtarlari"
            subtitle="Anahtarlar AES-256 ile sifrelenir"
            action={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Key className="h-4 w-4" />
              </div>
            }
          />
          <div className="space-y-3">
            <Input label="Trendyol API Key" type="password" placeholder="••••••••••••" />
            <Input label="Trendyol API Secret" type="password" placeholder="••••••••••••" />
            <Input label="Trendyol Seller ID" placeholder="12345678" />
            <Button size="sm">Kaydet</Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Guvenlik"
            action={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/10 text-success-400">
                <Shield className="h-4 w-4" />
              </div>
            }
          />
          <div className="space-y-3">
            <Input label="Mevcut Sifre" type="password" placeholder="••••••••" />
            <Input label="Yeni Sifre" type="password" placeholder="••••••••" />
            <Button size="sm" variant="secondary">Sifreyi Degistir</Button>
          </div>
        </Card>

        {notifLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <TelegramSettings
              settings={notifSettings}
              saving={saving}
              testingTelegram={testingTelegram}
              testResult={testResult}
              onSave={saveNotif}
              onTest={testTelegram}
              onClearTest={clearTestResult}
            />

            <BrowserNotifSettings
              settings={notifSettings}
              saving={saving}
              onSave={saveNotif}
            />

            <AlertPreferences
              settings={notifSettings}
              saving={saving}
              onSave={saveNotif}
            />
          </>
        )}
      </div>
    </div>
  )
}
