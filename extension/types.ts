/* ------------------------------------------------------------------ */
/*  Shared Types for Sky-Market Chrome Extension                       */
/* ------------------------------------------------------------------ */

/** Supabase credentials stored in chrome.storage.local */
export interface StoredAuth {
    supabaseUrl: string
    supabaseAnonKey: string
    accessToken: string
    refreshToken: string
    expiresAt: number          // Unix timestamp (seconds)
    userId: string
    storeId: string | null
}

/** Parsed product data from Trendyol */
export interface TrendyolProductData {
    url: string
    productName: string
    currentPrice: number
    originalPrice: number | null   // Crossed-out price if on sale
    sellerName: string
    category: string | null
    imageUrl: string | null
    rating: number | null
    reviewCount: number | null
    brandName: string | null
}

/* ------------------------------------------------------------------ */
/*  Message Types (Content ↔ Background)                               */
/* ------------------------------------------------------------------ */

export interface AuthTokenMessage {
    type: 'AUTH_TOKEN'
    payload: {
        accessToken: string
        refreshToken: string
        expiresAt: number
        userId: string
        supabaseUrl: string
        supabaseAnonKey: string
    }
}

export interface AuthStatusRequest {
    type: 'AUTH_STATUS'
}

export interface AuthStatusResponse {
    connected: boolean
    userId: string | null
    expiresAt: number | null
}

export interface PriceDataMessage {
    type: 'PRICE_DATA'
    payload: TrendyolProductData
}

export interface PriceDataResponse {
    success: boolean
    error?: string
    matchedProductId?: string
}

export interface LastCaptureRequest {
    type: 'LAST_CAPTURE'
}

export interface LastCaptureResponse {
    data: TrendyolProductData | null
    timestamp: number | null
}

export type ExtensionMessage =
    | AuthTokenMessage
    | AuthStatusRequest
    | PriceDataMessage
    | LastCaptureRequest
