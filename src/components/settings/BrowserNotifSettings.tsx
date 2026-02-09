import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  isBrowserNotificationSupported,
  getBrowserPermission,
  requestBrowserPermission,
  sendBrowserNotification,
} from '@/lib/browser-notifications'
import { cn } from '@/lib/utils'
import type { useNotifications } from '@/hooks/useNotifications'

type NotifHook = ReturnType<typeof useNotifications>

interface BrowserNotifSettingsProps {
  settings: NotifHook['settings']
  saving: NotifHook['saving']
  onSave: NotifHook['save']
}

export function BrowserNotifSettings({ settings, onSave }: BrowserNotifSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [enabled, setEnabled] = useState(false)
  const [tested, setTested] = useState(false)

  useEffect(() => {
    setPermission(getBrowserPermission())
  }, [])

  useEffect(() => {
    if (settings) setEnabled(settings.browser_enabled)
  }, [settings])

  async function handleRequestPermission() {
    const result = await requestBrowserPermission()
    setPermission(result)
    if (result === 'granted') {
      setEnabled(true)
      onSave({ browser_enabled: true })
    }
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    onSave({ browser_enabled: next })
  }

  function handleTestNotification() {
    sendBrowserNotification(
      'price_drop',
      'Test Urunu',
      'Bu bir test bildirimidir. Bildirimler calisiyor!'
    )
    setTested(true)
    setTimeout(() => setTested(false), 3000)
  }

  const isSupported = isBrowserNotificationSupported()
  const isGranted = permission === 'granted'
  const isDenied = permission === 'denied'

  return (
    <Card>
      <CardHeader
        title="Tarayici Bildirimleri"
        subtitle="Masaustu push bildirim alin"
        action={
          <div className="flex items-center gap-2">
            {!isSupported && <Badge variant="danger">Desteklenmiyor</Badge>}
            {isSupported && isGranted && enabled && <Badge variant="success">Aktif</Badge>}
            {isSupported && isDenied && <Badge variant="danger">Engellendi</Badge>}
            {isSupported && !isDenied && (
              <button
                onClick={handleToggle}
                disabled={!isGranted}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors duration-200',
                  enabled && isGranted ? 'bg-brand-500' : 'bg-surface-700',
                  !isGranted && 'opacity-40 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200',
                    enabled && isGranted ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-3">
        {!isSupported && (
          <div className="flex items-center gap-2 rounded-lg border border-danger-500/20 bg-danger-500/5 p-2.5">
            <BellOff className="h-4 w-4 text-danger-400 shrink-0" />
            <p className="text-xs text-danger-400">Bu tarayici bildirim desteklemiyor.</p>
          </div>
        )}

        {isSupported && isDenied && (
          <div className="flex items-center gap-2 rounded-lg border border-danger-500/20 bg-danger-500/5 p-2.5">
            <XCircle className="h-4 w-4 text-danger-400 shrink-0" />
            <p className="text-xs text-danger-400">
              Bildirim izni engellendi. Tarayici ayarlarindan izin verin.
            </p>
          </div>
        )}

        {isSupported && !isGranted && !isDenied && (
          <div className="space-y-2">
            <div className="rounded-lg border border-white/5 bg-surface-800/30 p-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Tarayici bildirimlerini etkinlestirmek icin izin vermeniz gerekmektedir.
                Fiyat degisiklikleri ve marj uyarilari aninda masaustunde goruntulenir.
              </p>
            </div>
            <Button size="sm" onClick={handleRequestPermission}>
              <Bell className="h-3.5 w-3.5" />
              Bildirim Izni Ver
            </Button>
          </div>
        )}

        {isSupported && isGranted && (
          <div className={cn('space-y-2 transition-opacity duration-200', !enabled && 'opacity-40 pointer-events-none')}>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleTestNotification}>
                <Bell className="h-3.5 w-3.5" />
                Test Bildirimi Gonder
              </Button>
              {tested && (
                <span className="flex items-center gap-1 text-xs text-success-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Gonderildi
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
