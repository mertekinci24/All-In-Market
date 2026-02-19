/* ------------------------------------------------------------------ */
/*  Popup Script — Sky-Market Chrome Extension                         */
/* ------------------------------------------------------------------ */

import type { AuthStatusResponse, LastCaptureResponse } from '../types.js'

async function init() {
    // 1. Check auth status
    const connectionBadge = document.getElementById('connection-badge')!
    const sessionInfo = document.getElementById('session-info')!
    const captureContent = document.getElementById('capture-content')!

    try {
        const authStatus = await chrome.runtime.sendMessage({ type: 'AUTH_STATUS' }) as AuthStatusResponse

        if (authStatus.connected) {
            connectionBadge.className = 'badge badge-success'
            connectionBadge.textContent = '● Bağlı'

            if (authStatus.expiresAt) {
                const expiresIn = Math.max(0, authStatus.expiresAt - Math.floor(Date.now() / 1000))
                const minutes = Math.floor(expiresIn / 60)
                sessionInfo.className = 'status-value connected'
                sessionInfo.textContent = `${minutes} dk kaldı`
            }
        } else {
            connectionBadge.className = 'badge badge-danger'
            connectionBadge.textContent = '● Bağlı Değil'
            sessionInfo.className = 'status-value disconnected'
            sessionInfo.textContent = 'Dashboard\'u açın'
        }
    } catch {
        connectionBadge.className = 'badge badge-danger'
        connectionBadge.textContent = '● Hata'
    }

    // 2. Check last capture
    try {
        const lastCapture = await chrome.runtime.sendMessage({ type: 'LAST_CAPTURE' }) as LastCaptureResponse

        if (lastCapture.data && lastCapture.timestamp) {
            const timeAgo = getTimeAgo(lastCapture.timestamp)
            captureContent.className = 'capture-data'
            captureContent.innerHTML = `
        <div class="capture-name">${escapeHtml(lastCapture.data.productName)}</div>
        <div class="capture-price">${lastCapture.data.currentPrice.toLocaleString('tr-TR')} TL</div>
        <div class="capture-seller">${escapeHtml(lastCapture.data.sellerName)}</div>
        <div class="capture-time">${timeAgo}</div>
      `
        }
    } catch {
        // No capture data available
    }
}

function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Az önce'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dakika önce`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`
    return `${Math.floor(seconds / 86400)} gün önce`
}

function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

init()
