type AlertType = 'price_drop' | 'margin_warning' | 'stock_change' | 'competitor_change'

const ALERT_TITLES: Record<AlertType, string> = {
  price_drop: 'Fiyat Dususu Uyarisi',
  margin_warning: 'Marj Uyarisi',
  stock_change: 'Stok Degisikligi',
  competitor_change: 'Rakip Fiyat Degisikligi',
}

export function isBrowserNotificationSupported(): boolean {
  return 'Notification' in window
}

export function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  const result = await Notification.requestPermission()
  return result
}

export function sendBrowserNotification(
  alertType: AlertType,
  productName: string,
  body: string
): void {
  if (!isBrowserNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  const title = `${ALERT_TITLES[alertType]} - ${productName}`

  new Notification(title, {
    body,
    icon: '/vite.svg',
    tag: `${alertType}-${productName}`,
    silent: false,
  })
}
