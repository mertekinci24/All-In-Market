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

/** Parsed product data from Trendyol (Ultra-rich version) */
export interface TrendyolProductData {
    // Basic Info
    url: string
    contentId: string | null
    productName: string
    brandName: string | null
    category: string | null

    // Pricing
    currentPrice: number
    originalPrice: number | null
    discountPercentage: number | null
    campaignName: string | null

    // Seller
    sellerId: string | null
    sellerName: string
    sellerRating: number | null
    sellerFollowers: number | null
    sellerBadges: string[]

    // Stock & Availability
    isAvailable: boolean
    stockStatus: string
    stockQuantity: number | null
    deliveryTime: string | null

    // Reviews & Rating
    rating: number | null
    reviewCount: number | null
    reviewBreakdown: {
        five: number
        four: number
        three: number
        two: number
        one: number
    } | null
    topReviews: Array<{
        text: string
        rating: number
        date: string | null
        verified: boolean
    }> | null

    // Media
    imageUrl: string | null
    allImages: string[]
    videoUrl: string | null

    // Variants
    variants: Array<{
        type: string
        options: string[]
    }> | null

    // Specifications
    specifications: Record<string, string> | null

    // Shipping
    freeShipping: boolean
    freeShippingThreshold: number | null
    shippingCost: number | null

    // Engagement
    favoriteCount: number | null
    questionCount: number | null

    // Competition
    similarProducts: Array<{
        name: string
        price: number
        url: string
    }> | null
    frequentlyBoughtTogether: Array<{
        name: string
        price: number
        url: string
    }> | null
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
