import { useState, useEffect } from 'react'
import { Send, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { useNotifications } from '@/hooks/useNotifications'

type NotifHook = ReturnType<typeof useNotifications>

interface TelegramSettingsProps {
  settings: NotifHook['settings']
  saving: NotifHook['saving']
  testingTelegram: NotifHook['testingTelegram']
  testResult: NotifHook['testResult']
  onSave: NotifHook['save']
  onTest: NotifHook['testTelegram']
  onClearTest: NotifHook['clearTestResult']
}

export function TelegramSettings({
  settings,
  saving,
  testingTelegram,
  testResult,
  onSave,
  onTest,
  onClearTest,
}: TelegramSettingsProps) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (settings) {
      setBotToken(settings.telegram_bot_token ?? '')
      setChatId(settings.telegram_chat_id ?? '')
      setEnabled(settings.telegram_enabled)
    }
  }, [settings])

  function handleSave() {
    onSave({
      telegram_enabled: enabled,
      telegram_bot_token: botToken || null,
      telegram_chat_id: chatId || null,
    })
    onClearTest()
  }

  function handleTest() {
    if (!botToken || !chatId) return
    onTest(botToken, chatId)
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    onSave({ telegram_enabled: next })
  }

  const hasCredentials = botToken.length > 0 && chatId.length > 0
  const isDirty =
    botToken !== (settings?.telegram_bot_token ?? '') ||
    chatId !== (settings?.telegram_chat_id ?? '')

  return (
    <Card>
      <CardHeader
        title="Telegram Bildirimleri"
        subtitle="Bot uzerinden anlik bildirim alin"
        action={
          <div className="flex items-center gap-2">
            {settings?.telegram_enabled && (
              <Badge variant="success">Aktif</Badge>
            )}
            <button
              onClick={handleToggle}
              className={cn(
                'relative h-5 w-9 rounded-full transition-colors duration-200',
                enabled ? 'bg-brand-500' : 'bg-surface-700'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200',
                  enabled ? 'left-[18px]' : 'left-0.5'
                )}
              />
            </button>
          </div>
        }
      />

      <div className={cn('space-y-3 transition-opacity duration-200', !enabled && 'opacity-40 pointer-events-none')}>
        <div className="rounded-lg border border-white/5 bg-surface-800/30 p-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            1. Telegram'da <span className="text-gray-300">@BotFather</span>'a gidin ve <span className="text-gray-300">/newbot</span> komutu ile bot olusturun.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed mt-1">
            2. Bot token'i asagiya yapisitirin. Chat ID icin botu grubunuza ekleyin veya <span className="text-gray-300">@userinfobot</span>'u kullanin.
          </p>
          <a
            href="https://core.telegram.org/bots#how-do-i-create-a-bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-400 mt-2 hover:text-brand-300 transition-colors"
          >
            Telegram Bot Dokumantasyonu
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Input
          label="Bot Token"
          type="password"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          value={botToken}
          onChange={(e) => { setBotToken(e.target.value); onClearTest() }}
        />
        <Input
          label="Chat ID"
          placeholder="-1001234567890"
          value={chatId}
          onChange={(e) => { setChatId(e.target.value); onClearTest() }}
        />

        {testResult && (
          <div className={cn(
            'flex items-center gap-2 rounded-lg border p-2.5',
            testResult.ok
              ? 'border-success-500/20 bg-success-500/5'
              : 'border-danger-500/20 bg-danger-500/5'
          )}>
            {testResult.ok ? (
              <CheckCircle className="h-4 w-4 text-success-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-danger-400 shrink-0" />
            )}
            <p className={cn('text-xs', testResult.ok ? 'text-success-400' : 'text-danger-400')}>
              {testResult.message}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTest}
            disabled={!hasCredentials || testingTelegram}
          >
            {testingTelegram ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-400" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {testingTelegram ? 'Gonderiliyor...' : 'Test Gonder'}
          </Button>
          {isDirty && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
