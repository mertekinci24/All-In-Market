/* ------------------------------------------------------------------ */
/*  Trendyol Product Parser — Content Script                           */
/*  Runs on Trendyol product pages (trendyol.com product URLs)         */
/* ------------------------------------------------------------------ */

// Define types locally to avoid module output
interface TrendyolProductData {
    url: string
    productName: string
    currentPrice: number
    originalPrice: number | null
    sellerName: string
    category: string | null
    imageUrl: string | null
    rating: number | null
    reviewCount: number | null
    brandName: string | null
}

interface PriceDataResponse {
    success: boolean
    error?: string
    matchedProductId?: string
}

; (function trendyolParser() {
    // LOUD DEBUG LOG
    console.log('%c [SKY] PARSER BAŞLATILDI - Lütfen bu mesajı görüyor musunuz?', 'background: #00b26e; color: white; font-size: 16px; padding: 4px; border-radius: 4px;')

    const LOG_PREFIX = '[SKY Parser]'

    // Check if valid product page (-p- implies product)
    if (!window.location.href.includes('-p-')) {
        console.log(LOG_PREFIX, 'Not a product page (no -p- in URL), skipping.')
        return
    }

    /* ---------------------------------------------------------------- */
    /*  Configurable DOM Selectors (easy to update if Trendyol changes) */
    /* ---------------------------------------------------------------- */

    const SELECTORS = {
        // Price - Updated for 2026 Trendyol layout
        currentPrice: '.product-price-container .prc-dsc, .product-price-container .prc-slg, .ps-product-price .price, .pr-bx-w .prc-box-sll, .prc-box-sll, .product-price-container',
        originalPrice: '.product-price-container .prc-org, .ps-product-price .original-price',

        // Product name
        productName: '.pr-new-br h1.pr-new-br span, h1.pr-new-br, .product-detail-name',

        // Seller
        sellerName: '.merchant-text a, .seller-name-text, a[class*="merchant"]',

        // Category breadcrumb
        categoryBreadcrumb: '.breadcrumb-wrapper a, [data-testid="breadcrumb"] a',

        // Image
        productImage: '.gallery-modal-content img, .base-product-image img, img.ph-gl-img',

        // Rating
        ratingScore: '.pr-rnr-sm .tltp-avg, .rating-score',
        reviewCount: '.pr-rnr-sm .rnr-cm-cnt, .total-review-count',

        // Brand
        brandName: '.pr-new-br a, .product-brand-name-with-link a',
    } as const

    /* ---------------------------------------------------------------- */
    /*  Parser Functions                                                 */
    /* ---------------------------------------------------------------- */

    function parsePrice(text: string | null): number | null {
        if (!text) return null
        // Trendyol formats: "1.299,99 TL" or "₺1.299,99"
        const cleaned = text
            .replace(/[^\d.,]/g, '')    // Remove everything except digits, dots, commas
            .replace(/\./g, '')         // Remove thousand separators
            .replace(',', '.')          // Convert decimal comma to dot
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
    }

    function selectText(selector: string): string | null {
        const el = document.querySelector(selector)
        return el?.textContent?.trim() ?? null
    }

    function selectTexts(selectors: string): string | null {
        // Try each comma-separated selector
        for (const sel of selectors.split(',')) {
            const text = selectText(sel.trim())
            if (text) return text
        }
        return null
    }

    function getJsonLdProduct(): Partial<TrendyolProductData> | null {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]')
            for (const script of scripts) {
                const content = script.textContent || '{}'
                // Some scripts might be empty or invalid
                if (!content.trim()) continue

                const json = JSON.parse(content)
                const items = Array.isArray(json) ? json : [json]

                for (const item of items) {
                    if (item['@type'] === 'Product') {
                        const result: any = {}

                        // Name
                        if (item.name) result.productName = item.name

                        // Image
                        if (item.image) {
                            if (Array.isArray(item.image)) result.imageUrl = item.image[0]
                            else if (typeof item.image === 'string') result.imageUrl = item.image
                            else if (item.image.url) result.imageUrl = item.image.url
                        }

                        // Brand
                        if (item.brand) {
                            if (typeof item.brand === 'string') result.brandName = item.brand
                            else if (item.brand.name) result.brandName = item.brand.name
                        }

                        // Rating
                        if (item.aggregateRating) {
                            if (item.aggregateRating.ratingValue) result.rating = parseFloat(item.aggregateRating.ratingValue)
                            if (item.aggregateRating.reviewCount) result.reviewCount = parseInt(item.aggregateRating.reviewCount)
                        }

                        // Offers (Price & Seller)
                        if (item.offers) {
                            const offers = Array.isArray(item.offers) ? item.offers : [item.offers]
                            for (const offer of offers) {
                                // Price
                                if (offer.price) result.currentPrice = parseFloat(offer.price)
                                else if (offer.lowPrice) result.currentPrice = parseFloat(offer.lowPrice)

                                // Seller
                                if (offer.seller) {
                                    if (typeof offer.seller === 'string') result.sellerName = offer.seller
                                    else if (offer.seller.name) result.sellerName = offer.seller.name
                                }

                                if (result.currentPrice) break
                            }
                        }

                        // If we found at least price, return this candidate
                        if (result.currentPrice) {
                            return result
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[SKY] JSON-LD error:', e)
        }
        return null
    }

    function parseProductData(): TrendyolProductData | null {
        // 1. Try JSON-LD first (Most robust)
        const jsonLdData = getJsonLdProduct()

        let currentPrice: number | null | undefined = jsonLdData?.currentPrice
        if (!currentPrice) {
            const priceText = selectTexts(SELECTORS.currentPrice)
            currentPrice = parsePrice(priceText)
        }

        if (!currentPrice) {
            console.log(LOG_PREFIX, 'Could not find current price (JSON-LD & CSS failed)')
            return null
        }

        // Product Name
        let productName: string | null | undefined = jsonLdData?.productName
        if (!productName) {
            productName = selectTexts(SELECTORS.productName)
        }

        if (!productName) {
            console.log(LOG_PREFIX, 'Could not find product name')
            return null
        }

        // Image
        let imageUrl: string | null | undefined = jsonLdData?.imageUrl
        if (!imageUrl) {
            const imgEl = document.querySelector(SELECTORS.productImage.split(',')[0].trim()) as HTMLImageElement | null
            imageUrl = imgEl?.src ?? null
        }

        // Seller
        let sellerName: string | null | undefined = jsonLdData?.sellerName
        if (!sellerName) {
            sellerName = selectTexts(SELECTORS.sellerName) ?? 'Bilinmeyen Satıcı'
        }

        // Brand
        let brandName: string | null | undefined = jsonLdData?.brandName
        if (!brandName) {
            brandName = selectTexts(SELECTORS.brandName)
        }

        // Rating
        let rating: number | null | undefined = jsonLdData?.rating
        if (rating === undefined || rating === null) {
            const ratingText = selectTexts(SELECTORS.ratingScore)
            rating = ratingText ? parseFloat(ratingText.replace(',', '.')) : null
        }

        // Review Count
        let reviewCount: number | null | undefined = jsonLdData?.reviewCount
        if (reviewCount === undefined || reviewCount === null) {
            const reviewText = selectTexts(SELECTORS.reviewCount)
            reviewCount = reviewText ? parseInt(reviewText.replace(/\D/g, ''), 10) : null
        }

        // Original Price (Usually not in JSON-LD in a simple way, often requires calculating form highPrice or similar)
        const origText = selectTexts(SELECTORS.originalPrice)
        const originalPrice = parsePrice(origText)

        // Category from breadcrumbs (last meaningful one)
        let category: string | null = null
        const breadcrumbs = document.querySelectorAll(SELECTORS.categoryBreadcrumb.split(',')[0].trim())
        if (breadcrumbs.length > 1) {
            category = breadcrumbs[breadcrumbs.length - 1]?.textContent?.trim() ?? null
        }

        return {
            url: window.location.href,
            productName: productName!, // asserted not null by check above
            currentPrice,
            originalPrice: originalPrice !== currentPrice ? originalPrice : null,
            sellerName,
            category,
            imageUrl,
            rating: rating && !isNaN(rating) ? rating : null,
            reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : null,
            brandName,
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Floating Badge UI                                                */
    /* ---------------------------------------------------------------- */

    function createBadge() {
        // Create container
        const badge = document.createElement('div')
        badge.id = 'sky-market-badge'

        // Create inner
        const inner = document.createElement('div')
        inner.id = 'sky-badge-inner'

        // Apply styles directly to properties to avoid CSP issues
        const s = inner.style
        s.position = 'fixed'
        s.bottom = '20px'
        s.right = '20px'
        s.zIndex = '999999'
        s.display = 'flex'
        s.alignItems = 'center'
        s.gap = '8px'
        s.padding = '10px 16px'
        s.borderRadius = '12px'
        s.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        s.border = '1px solid rgba(0, 178, 110, 0.3)'
        s.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 178, 110, 0.1)'
        s.fontFamily = "'Inter', system-ui, sans-serif"
        s.fontSize = '12px'
        s.color = '#e2e8f0'
        s.cursor = 'pointer'
        s.transition = 'all 0.3s ease'
        s.backdropFilter = 'blur(12px)'

        // Logo
        const logo = document.createElement('span')
        logo.textContent = 'SM'
        const ls = logo.style
        ls.display = 'flex'
        ls.alignItems = 'center'
        ls.justifyContent = 'center'
        ls.width = '24px'
        ls.height = '24px'
        ls.borderRadius = '8px'
        ls.background = 'rgba(0, 178, 110, 0.15)'
        ls.color = '#00b26e'
        ls.fontWeight = '700'
        ls.fontSize = '11px'

        inner.appendChild(logo)

        // Text
        const text = document.createElement('span')
        text.id = 'sky-badge-text'
        text.textContent = 'Taranıyor...'
        inner.appendChild(text)

        // Events
        inner.addEventListener('mouseenter', () => {
            s.borderColor = 'rgba(0, 178, 110, 0.6)'
            s.transform = 'translateY(-2px)'
        })
        inner.addEventListener('mouseleave', () => {
            s.borderColor = 'rgba(0, 178, 110, 0.3)'
            s.transform = 'translateY(0)'
        })

        badge.appendChild(inner)
        document.body.appendChild(badge)
        return badge
    }

    function updateBadge(badge: HTMLElement, status: 'scanning' | 'success' | 'error' | 'no-match', detail?: string) {
        const textEl = badge.querySelector('#sky-badge-text')
        if (!textEl) return

        const messages = {
            scanning: '⏳ Taranıyor...',
            success: `✅ ${detail ?? 'Fiyat yakalandı!'}`,
            error: `❌ ${detail ?? 'Hata oluştu'}`,
            'no-match': `⚠️ ${detail ?? 'Ürün Dashboard\'da yok'}`,
        }

        textEl.textContent = messages[status]

        // Auto-fade after 10 seconds
        if (status !== 'scanning') {
            setTimeout(() => {
                const inner = badge.querySelector('#sky-badge-inner') as HTMLElement
                if (inner) {
                    inner.style.opacity = '0.6'
                }
            }, 10_000)
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Main                                                             */
    /* ---------------------------------------------------------------- */

    async function run() {
        console.log(LOG_PREFIX, 'Parser loaded on:', window.location.href)

        // Wait for page to fully render (Trendyol uses client-side rendering)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const badge = createBadge()

        // Parse product data
        const data = parseProductData()
        if (!data) {
            updateBadge(badge, 'error', 'Fiyat bulunamadı')
            return
        }

        console.log(LOG_PREFIX, 'Parsed:', data.productName, '→', data.currentPrice, 'TL')
        updateBadge(badge, 'scanning', `${data.currentPrice} TL`)

        // Send to background
        chrome.runtime.sendMessage(
            { type: 'PRICE_DATA', payload: data },
            (response: PriceDataResponse) => {
                if (chrome.runtime.lastError) {
                    updateBadge(badge, 'error', 'Extension bağlantı hatası')
                    console.error(LOG_PREFIX, chrome.runtime.lastError.message)
                    return
                }

                if (response.success && response.matchedProductId) {
                    updateBadge(badge, 'success', `${data.currentPrice} TL → Dashboard`)
                } else if (response.success && response.error) {
                    updateBadge(badge, 'no-match', response.error)
                } else {
                    updateBadge(badge, 'error', response.error ?? 'Bilinmeyen hata')
                }
            },
        )
    }

    run()
})()
