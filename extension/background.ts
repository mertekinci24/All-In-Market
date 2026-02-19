/* ------------------------------------------------------------------ */
/*  Service Worker (Background) — Sky-Market Chrome Extension          */
/*  Handles auth token storage and Supabase REST API calls             */
/* ------------------------------------------------------------------ */

import { insertRow, selectRows, isTokenExpired, refreshToken } from './lib/supabase-rest.js'
import type {
    StoredAuth,
    ExtensionMessage,
    AuthStatusResponse,
    PriceDataResponse,
    LastCaptureResponse,
    TrendyolProductData,
} from './types.js'

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let lastCapture: { data: TrendyolProductData; timestamp: number } | null = null

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function getAuth(): Promise<StoredAuth | null> {
    const result = await chrome.storage.local.get('auth')
    return (result.auth as StoredAuth | undefined) ?? null
}

async function setAuth(auth: StoredAuth): Promise<void> {
    await chrome.storage.local.set({ auth })
}

async function ensureValidToken(): Promise<StoredAuth | null> {
    const auth = await getAuth()
    if (!auth) return null

    if (!isTokenExpired(auth.expiresAt)) return auth

    // Token expired → refresh
    console.log('[SKY] Token expired, refreshing...')
    const refreshed = await refreshToken(auth.supabaseUrl, auth.supabaseAnonKey, auth.refreshToken)
    if (!refreshed) {
        console.warn('[SKY] Token refresh failed')
        await chrome.storage.local.remove('auth')
        return null
    }

    const updated: StoredAuth = {
        ...auth,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
    }
    await setAuth(updated)
    return updated
}

/* ------------------------------------------------------------------ */
/*  Message Handlers                                                   */
/* ------------------------------------------------------------------ */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'

async function handleAuthToken(msg: ExtensionMessage & { type: 'AUTH_TOKEN' }): Promise<{ success: boolean }> {
    const { accessToken, refreshToken: rt, expiresAt, userId } = msg.payload

    // Use hardcoded config from config.ts
    const supabaseUrl = SUPABASE_URL
    const supabaseAnonKey = SUPABASE_ANON_KEY

    // Fetch storeId from Supabase
    let storeId: string | null = null
    try {
        const res = await selectRows(
            'stores',
            `user_id=eq.${userId}&select=id&limit=1`,
            { url: supabaseUrl, anonKey: supabaseAnonKey, accessToken },
        )
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            storeId = (res.data[0] as { id: string }).id
        }
    } catch (err) {
        console.warn('[SKY] Could not fetch storeId:', err)
    }

    const auth: StoredAuth = {
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        refreshToken: rt,
        expiresAt,
        userId,
        storeId,
    }

    await setAuth(auth)
    console.log('[SKY] Auth token stored, expiresAt:', expiresAt, 'storeId:', storeId)

    // Update extension badge
    await chrome.action.setBadgeText({ text: '✓' })
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' })

    return { success: true }
}

async function handleAuthStatus(): Promise<AuthStatusResponse> {
    const auth = await getAuth()
    if (!auth) return { connected: false, userId: null, expiresAt: null }

    const isValid = !isTokenExpired(auth.expiresAt)
    return {
        connected: isValid,
        userId: auth.userId,
        expiresAt: auth.expiresAt,
    }
}

async function handlePriceData(msg: ExtensionMessage & { type: 'PRICE_DATA' }): Promise<PriceDataResponse> {
    const auth = await ensureValidToken()
    if (!auth) {
        return { success: false, error: 'Not authenticated. Please open Sky-Market Dashboard first.' }
    }
    if (!auth.storeId) {
        return { success: false, error: 'No store found. Please create a store in Dashboard.' }
    }

    const product = msg.payload

    // Try to match product by marketplace_url or name
    const config = { url: auth.supabaseUrl, anonKey: auth.supabaseAnonKey, accessToken: auth.accessToken }

    // Try URL match first
    let matchedProductId: string | null = null
    const urlBase = product.url.split('?')[0]

    const urlResult = await selectRows(
        'products',
        `store_id=eq.${auth.storeId}&marketplace_url=like.*${encodeURIComponent(urlBase.split('/').pop() ?? '')}*&select=id&limit=1`,
        config,
    )
    if (urlResult.data && Array.isArray(urlResult.data) && urlResult.data.length > 0) {
        matchedProductId = (urlResult.data[0] as { id: string }).id
    }

    // Store last capture
    lastCapture = { data: product, timestamp: Date.now() }

    // If we found a matching product, insert price snapshot
    if (matchedProductId) {
        const snapshotRes = await insertRow('price_snapshots', {
            product_id: matchedProductId,
            sales_price: product.currentPrice,
            competitor_price: null,
            buy_price: 0,
            snapshot_date: new Date().toISOString().split('T')[0],
        }, config)

        if (snapshotRes.error) {
            console.warn('[SKY] Snapshot insert error:', snapshotRes.error)
            return { success: false, error: snapshotRes.error }
        }

        // Also update product's sales_price and last_scraped
        const updateEndpoint = `${auth.supabaseUrl}/rest/v1/products?id=eq.${matchedProductId}`
        await fetch(updateEndpoint, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': auth.supabaseAnonKey,
                'Authorization': `Bearer ${auth.accessToken}`,
            },
            body: JSON.stringify({
                sales_price: product.currentPrice,
                competitor_price: product.originalPrice,
                last_scraped: new Date().toISOString(),
            }),
        })

        console.log('[SKY] Price snapshot saved for product:', matchedProductId)
        return { success: true, matchedProductId }
    }

    // No match found — still capture the data for potential future use
    console.log('[SKY] No matching product found for:', product.productName)
    return {
        success: true,
        error: 'Ürün Dashboard\'da bulunamadı. Önce ürünü ekleyin.',
    }
}

async function handleLastCapture(): Promise<LastCaptureResponse> {
    return {
        data: lastCapture?.data ?? null,
        timestamp: lastCapture?.timestamp ?? null,
    }
}

/* ------------------------------------------------------------------ */
/*  Main Listener                                                      */
/* ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    const handler = async () => {
        switch (message.type) {
            case 'AUTH_TOKEN':
                return handleAuthToken(message as ExtensionMessage & { type: 'AUTH_TOKEN' })
            case 'AUTH_STATUS':
                return handleAuthStatus()
            case 'PRICE_DATA':
                return handlePriceData(message as ExtensionMessage & { type: 'PRICE_DATA' })
            case 'LAST_CAPTURE':
                return handleLastCapture()
            default:
                return { error: 'Unknown message type' }
        }
    }

    handler().then(sendResponse).catch((err) => {
        console.error('[SKY] Handler error:', err)
        sendResponse({ error: (err as Error).message })
    })

    return true // async sendResponse
})

/* ------------------------------------------------------------------ */
/*  Install / Startup                                                  */
/* ------------------------------------------------------------------ */

chrome.runtime.onInstalled.addListener(() => {
    console.log('[SKY] Sky-Market Live Intelligence installed')
    chrome.action.setBadgeText({ text: '' })
})
