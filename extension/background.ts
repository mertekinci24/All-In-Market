/* ------------------------------------------------------------------ */
/*  Service Worker (Background) — Sky-Market Chrome Extension          */
/*  Handles auth token storage and Supabase REST API calls             */
/* ------------------------------------------------------------------ */

import { insertRow, selectRows, isTokenExpired, refreshToken } from './lib/supabase-rest.js'
import { storeCredentials } from './lib/secure-storage.js'
import { withRefreshLock } from './lib/token-mutex.js'
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

    // Token expired → refresh with mutex (TD-17 fix)
    console.log('[SKY] Token expired, refreshing with mutex...')

    const refreshed = await withRefreshLock(async () => {
        // Double-check token hasn't been refreshed by another tab
        const currentAuth = await getAuth()
        if (currentAuth && !isTokenExpired(currentAuth.expiresAt)) {
            console.log('[SKY] Token already refreshed by another tab')
            return currentAuth
        }

        // Perform refresh (V1.5.0 - BUG-05 fix: detailed error handling)
        const result = await refreshToken(auth.supabaseUrl, auth.supabaseAnonKey, auth.refreshToken)

        if (!result.success) {
            console.error('[SKY] Token refresh failed:', result.errorType, result.errorMessage)

            // Auth failure = invalid/expired refresh token → force logout
            if (result.errorType === 'auth_failed') {
                await chrome.storage.local.remove('auth')
                console.warn('[SKY] Invalid refresh token, clearing auth')
            } else {
                // Network error = transient, let caller retry
                console.warn('[SKY] Network error during refresh, auth state preserved for retry')
            }

            return null
        }

        const updated: StoredAuth = {
            ...auth,
            accessToken: result.accessToken!,
            refreshToken: result.refreshToken!,
            expiresAt: result.expiresAt!,
        }
        await setAuth(updated)
        console.log('[SKY] Token refreshed successfully')
        return updated
    })

    return refreshed
}

/* ------------------------------------------------------------------ */
/*  Message Handlers                                                   */
/* ------------------------------------------------------------------ */

async function handleAuthToken(msg: ExtensionMessage & { type: 'AUTH_TOKEN' }): Promise<{ success: boolean }> {
    const { accessToken, refreshToken: rt, expiresAt, userId, supabaseUrl, supabaseAnonKey } = msg.payload

    // V1.5.0: Credentials come from Dashboard, not hardcoded
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[SKY] Missing Supabase credentials in AUTH_TOKEN message')
        return { success: false }
    }

    // Store credentials securely in chrome.storage.sync
    try {
        await storeCredentials({ url: supabaseUrl, anonKey: supabaseAnonKey })
        console.log('[SKY] Credentials stored securely')
    } catch (err) {
        console.error('[SKY] Failed to store credentials:', err)
    }

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

    // Try URL match first (exact match to prevent injection)
    // BUG-10 fix: Only match active products
    let matchedProductId: string | null = null
    const urlBase = product.url.split('?')[0]

    const urlResult = await selectRows(
        'products',
        `store_id=eq.${auth.storeId}&marketplace_url=eq.${encodeURIComponent(urlBase)}&is_active=eq.true&select=id&limit=1`,
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

        // Update product with ALL scraped data (ultra-rich data mode)
        const updateEndpoint = `${auth.supabaseUrl}/rest/v1/products?id=eq.${matchedProductId}`

        // Build rich_data JSON with all extended information
        const richData = {
            // Pricing details
            discount_percentage: product.discountPercentage,
            campaign_name: product.campaignName,

            // Seller details
            seller_rating: product.sellerRating,
            seller_followers: product.sellerFollowers,
            seller_badges: product.sellerBadges,

            // Stock & Availability
            stock_quantity: product.stockQuantity,
            delivery_time: product.deliveryTime,

            // Reviews (detailed)
            review_breakdown: product.reviewBreakdown,
            top_reviews: product.topReviews,

            // Media
            all_images: product.allImages,
            video_url: product.videoUrl,

            // Variants
            variants: product.variants,

            // Specifications
            specifications: product.specifications,

            // Shipping
            free_shipping: product.freeShipping,
            free_shipping_threshold: product.freeShippingThreshold,
            shipping_cost: product.shippingCost,

            // Engagement
            favorite_count: product.favoriteCount,
            question_count: product.questionCount,

            // Competition
            similar_products: product.similarProducts,
            frequently_bought_together: product.frequentlyBoughtTogether,

            // Meta
            last_enriched: new Date().toISOString(),
        }

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
                content_id: product.contentId,
                seller_id: product.sellerId,
                brand_name: product.brandName,
                rating: product.rating,
                review_count: product.reviewCount,
                rich_data: richData,
                last_scraped: new Date().toISOString(),
            }),
        })

        console.log('[SKY] Ultra-rich data saved for product:', matchedProductId)

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
