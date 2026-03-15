/* ------------------------------------------------------------------ */
/*  Trendyol Product Parser — Content Script                           */
/*  Runs on Trendyol product pages (trendyol.com product URLs)         */
/* ------------------------------------------------------------------ */

// Define types locally to avoid module output
interface TrendyolProductData {
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
        // Price - BULLETPROOF: Discounted price FIRST, then single price
        currentPrice: '.prc-dsc, .product-price-container .prc-dsc, .prc-slg, .product-price-container .prc-slg, .ps-product-price .price, .pr-bx-w .prc-box-sll, .prc-box-sll',
        originalPrice: '.prc-org, .product-price-container .prc-org, .ps-product-price .original-price',
        discountBadge: '.dsct-bdg, .discount-badge, .product-discount-percentage',
        addToCartButton: '.add-to-basket, button[class*="basket"], button[class*="sepet"]',

        // Product name
        productName: '.pr-new-br h1.pr-new-br span, h1.pr-new-br, .product-detail-name',

        // Seller
        sellerName: '.merchant-text a, .seller-name-text, a[class*="merchant"]',
        sellerLink: '.merchant-text a, a[class*="merchant"]',
        sellerRating: '.seller-rating-score, .merchant-rating',
        sellerFollowers: '.seller-follower-count, .merchant-followers',
        sellerBadges: '.seller-badge, .merchant-badge, .official-store-badge',

        // Category breadcrumb
        categoryBreadcrumb: '.breadcrumb-wrapper a, [data-testid="breadcrumb"] a',

        // Images
        productImage: '.gallery-modal-content img, .base-product-image img, img.ph-gl-img',
        allImages: '.gallery-container img, .product-images img, .image-gallery img',
        videoPlayer: 'video, .product-video',

        // Rating & Reviews
        ratingScore: '.pr-rnr-sm .tltp-avg, .rating-score, .ratings-evaluations .star-w',
        reviewCount: '.pr-rnr-sm .rnr-cm-cnt, .total-review-count, .number-of-comments',
        reviewBreakdown: '.ratings-histogram, .review-ratings, .ratings-bar',
        reviewItems: '.rnr-com-w, .review-item, .comment-container',

        // Brand
        brandName: '.pr-new-br a, .product-brand-name-with-link a',

        // Stock & Delivery
        stockStatus: '.stock-status, .in-stock, .out-of-stock',
        deliveryInfo: '.delivery-info, .shipping-time, .cargo-time',
        freeShipping: '.free-shipping, .cargo-free',

        // Variants
        variantSelectors: '.variant-options, .sp-itm, .size-variants, .color-variants',

        // Specifications
        specTable: '.detail-attr-container, .product-spec-list, .specifications-table',

        // Engagement
        favoriteCount: '.favorite-count, .like-count',
        questionCount: '.question-count, .qa-count',

        // Similar Products
        similarProducts: '.recommendation-container, .similar-products, .related-products',
        frequentlyBought: '.bundle-products, .bought-together',
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
        return isNaN(num) || num <= 0 ? null : num
    }

    function parseSafeNumber(text: string | null, fallback: number | null = null): number | null {
        if (!text) return fallback
        const cleaned = text.replace(/\D/g, '')
        if (!cleaned) return fallback
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? fallback : num
    }

    function parseSafeFloat(text: string | null, fallback: number | null = null): number | null {
        if (!text) return fallback
        const cleaned = text.replace(',', '.')
        const num = parseFloat(cleaned)
        return isNaN(num) ? fallback : num
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

    function extractContentId(): string | null {
        // Extract from URL: trendyol.com/product-name-p-123456
        const match = window.location.href.match(/-p-(\d+)/)
        if (match) return match[1]

        // Try from __NEXT_DATA__ or similar
        try {
            const scripts = document.querySelectorAll('script[type="application/json"]')
            for (const script of scripts) {
                const text = script.textContent || ''
                if (text.includes('contentId') || text.includes('productId')) {
                    const json = JSON.parse(text)
                    if (json.contentId) return String(json.contentId)
                    if (json.productId) return String(json.productId)
                }
            }
        } catch {
            // Silent fail
        }

        return null
    }

    function extractSellerInfo(): {
        sellerId: string | null
        sellerRating: number | null
        sellerFollowers: number | null
        sellerBadges: string[]
    } {
        const sellerLink = document.querySelector(SELECTORS.sellerLink.split(',')[0].trim()) as HTMLAnchorElement | null
        const sellerId = sellerLink?.href.match(/\/butik\/(\d+)/)?.[1] ?? null

        const ratingText = selectTexts(SELECTORS.sellerRating)
        const sellerRating = parseSafeFloat(ratingText)

        const followersText = selectTexts(SELECTORS.sellerFollowers)
        const sellerFollowers = parseSafeNumber(followersText)

        const badgeElements = document.querySelectorAll(SELECTORS.sellerBadges.split(',').map(s => s.trim()).join(','))
        const sellerBadges = Array.from(badgeElements).map(el => el.textContent?.trim() || '').filter(Boolean)

        return { sellerId, sellerRating, sellerFollowers, sellerBadges }
    }

    function extractReviewData(): {
        reviewBreakdown: { five: number; four: number; three: number; two: number; one: number } | null
        topReviews: Array<{ text: string; rating: number; date: string | null; verified: boolean }> | null
    } {
        const reviewBreakdown = { five: 0, four: 0, three: 0, two: 0, one: 0 }
        let hasBreakdown = false

        // Try to extract review breakdown from histogram
        try {
            const histogramBars = document.querySelectorAll('.ratings-histogram .bar, .review-ratings .bar')
            histogramBars.forEach((bar, index) => {
                const countText = bar.querySelector('.count, .value')?.textContent || '0'
                const count = parseInt(countText.replace(/\D/g, ''))
                if (count > 0) {
                    hasBreakdown = true
                    if (index === 0) reviewBreakdown.five = count
                    else if (index === 1) reviewBreakdown.four = count
                    else if (index === 2) reviewBreakdown.three = count
                    else if (index === 3) reviewBreakdown.two = count
                    else if (index === 4) reviewBreakdown.one = count
                }
            })
        } catch {
            // Silent fail
        }

        // Extract top reviews
        const topReviews: Array<{ text: string; rating: number; date: string | null; verified: boolean }> = []
        try {
            const reviewElements = document.querySelectorAll(SELECTORS.reviewItems.split(',')[0].trim())
            for (let i = 0; i < Math.min(reviewElements.length, 20); i++) {
                const reviewEl = reviewElements[i]
                const text = reviewEl.querySelector('.comment-text, .review-content, .rnr-com-tx')?.textContent?.trim() || ''
                const ratingEl = reviewEl.querySelector('.star-w, .rating-stars, .review-rating')
                const ratingMatch = ratingEl?.className.match(/(\d)/) || ratingEl?.textContent?.match(/(\d)/)
                const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0
                const dateText = reviewEl.querySelector('.comment-date, .review-date')?.textContent?.trim() || null
                const verified = reviewEl.textContent?.includes('Doğrulanmış') || reviewEl.textContent?.includes('Verified') || false

                if (text && rating > 0) {
                    topReviews.push({ text, rating, date: dateText, verified })
                }
            }
        } catch {
            // Silent fail
        }

        return {
            reviewBreakdown: hasBreakdown ? reviewBreakdown : null,
            topReviews: topReviews.length > 0 ? topReviews : null
        }
    }

    function extractAllImages(): { allImages: string[]; videoUrl: string | null } {
        const allImages: string[] = []
        const imageElements = document.querySelectorAll(SELECTORS.allImages.split(',').map(s => s.trim()).join(','))

        imageElements.forEach(img => {
            const src = (img as HTMLImageElement).src || (img as HTMLImageElement).getAttribute('data-src')
            if (src && !src.includes('icon') && !src.includes('logo') && !allImages.includes(src)) {
                allImages.push(src)
            }
        })

        const videoEl = document.querySelector(SELECTORS.videoPlayer.split(',')[0].trim()) as HTMLVideoElement | null
        const videoUrl = videoEl?.src || videoEl?.getAttribute('data-src') || null

        return { allImages, videoUrl }
    }

    function extractVariants(): Array<{ type: string; options: string[] }> | null {
        const variants: Array<{ type: string; options: string[] }> = []

        try {
            const variantContainers = document.querySelectorAll('.variant-container, .sp-cntnr')
            variantContainers.forEach(container => {
                const typeEl = container.querySelector('.variant-title, .sp-ttl')
                const type = typeEl?.textContent?.trim() || 'Variant'

                const options: string[] = []
                const optionElements = container.querySelectorAll('.variant-option, .sp-itm')
                optionElements.forEach(optionEl => {
                    const optionText = optionEl.textContent?.trim()
                    if (optionText) options.push(optionText)
                })

                if (options.length > 0) {
                    variants.push({ type, options })
                }
            })
        } catch {
            // Silent fail
        }

        return variants.length > 0 ? variants : null
    }

    function extractSpecifications(): Record<string, string> | null {
        const specifications: Record<string, string> = {}

        try {
            const specTable = document.querySelector(SELECTORS.specTable.split(',')[0].trim())
            if (specTable) {
                const rows = specTable.querySelectorAll('li, tr')
                rows.forEach(row => {
                    const keyEl = row.querySelector('.detail-attr-item-key, .spec-key, th')
                    const valueEl = row.querySelector('.detail-attr-item-value, .spec-value, td')

                    if (keyEl && valueEl) {
                        const key = keyEl.textContent?.trim() || ''
                        const value = valueEl.textContent?.trim() || ''
                        if (key && value) {
                            specifications[key] = value
                        }
                    }
                })
            }
        } catch {
            // Silent fail
        }

        return Object.keys(specifications).length > 0 ? specifications : null
    }

    function extractShippingInfo(): {
        freeShipping: boolean
        freeShippingThreshold: number | null
        shippingCost: number | null
        deliveryTime: string | null
    } {
        const freeShippingText = selectTexts(SELECTORS.freeShipping)
        const freeShipping = !!freeShippingText

        let freeShippingThreshold: number | null = null
        if (freeShippingText && freeShippingText.includes('TL')) {
            const match = freeShippingText.match(/(\d+[.,]?\d*)\s*TL/)
            if (match) {
                freeShippingThreshold = parseFloat(match[1].replace(',', '.'))
            }
        }

        const deliveryTime = selectTexts(SELECTORS.deliveryInfo)

        let shippingCost: number | null = null
        const deliveryText = selectTexts('.shipping-cost, .cargo-price')
        if (deliveryText) {
            shippingCost = parsePrice(deliveryText)
        }

        return { freeShipping, freeShippingThreshold, shippingCost, deliveryTime }
    }

    function extractEngagementMetrics(): {
        favoriteCount: number | null
        questionCount: number | null
        stockQuantity: number | null
    } {
        const favText = selectTexts(SELECTORS.favoriteCount)
        const favoriteCount = parseSafeNumber(favText)

        const qText = selectTexts(SELECTORS.questionCount)
        const questionCount = parseSafeNumber(qText)

        // Stock quantity - try to extract from text like "Son 5 ürün"
        let stockQuantity: number | null = null
        const stockText = selectTexts(SELECTORS.stockStatus)
        if (stockText) {
            const match = stockText.match(/(\d+)\s*(ürün|adet)/i)
            if (match) stockQuantity = parseSafeNumber(match[1])
        }

        return { favoriteCount, questionCount, stockQuantity }
    }

    function checkStockAvailability(): boolean {
        // Check 1: Is "Add to Cart" button present and enabled?
        const addToCartBtn = document.querySelector(SELECTORS.addToCartButton)
        if (!addToCartBtn) {
            console.log(LOG_PREFIX, '[STOCK CHECK] Add to cart button not found → OUT OF STOCK')
            return false
        }

        const isDisabled = addToCartBtn.hasAttribute('disabled') || addToCartBtn.classList.contains('disabled')
        if (isDisabled) {
            console.log(LOG_PREFIX, '[STOCK CHECK] Add to cart button disabled → OUT OF STOCK')
            return false
        }

        // Check 2: Look for "out of stock" text
        const bodyText = document.body.textContent || ''
        const outOfStockKeywords = ['tükendi', 'stokta yok', 'stok kalmadı', 'tedarik edilemiyor', 'geçici olarak temin edilemiyor']
        for (const keyword of outOfStockKeywords) {
            if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
                console.log(LOG_PREFIX, `[STOCK CHECK] Found keyword "${keyword}" → OUT OF STOCK`)
                return false
            }
        }

        // Check 3: Stock status element check
        const stockText = selectTexts(SELECTORS.stockStatus)
        if (stockText) {
            const lowerStock = stockText.toLowerCase()
            if (lowerStock.includes('tükendi') || lowerStock.includes('yok')) {
                console.log(LOG_PREFIX, '[STOCK CHECK] Stock status text indicates out of stock')
                return false
            }
        }

        console.log(LOG_PREFIX, '[STOCK CHECK] Product is AVAILABLE ✓')
        return true
    }

    function extractSimilarProducts(): Array<{ name: string; price: number; url: string }> | null {
        const products: Array<{ name: string; price: number; url: string }> = []

        try {
            const container = document.querySelector(SELECTORS.similarProducts.split(',')[0].trim())
            if (container) {
                const productCards = container.querySelectorAll('.product-card, .recommendation-item, .prdct-cntnr-wrppr')
                productCards.forEach(card => {
                    const name = card.querySelector('.product-name, .prdct-desc-cntnr-name')?.textContent?.trim() || ''
                    const priceText = card.querySelector('.prc-box-dscntd, .product-price')?.textContent?.trim() || ''
                    const price = parsePrice(priceText) || 0
                    const linkEl = card.querySelector('a') as HTMLAnchorElement | null
                    const url = linkEl?.href || ''

                    if (name && price > 0 && url) {
                        products.push({ name, price, url })
                    }
                })
            }
        } catch {
            // Silent fail
        }

        return products.length > 0 ? products.slice(0, 10) : null
    }

    function extractFrequentlyBought(): Array<{ name: string; price: number; url: string }> | null {
        const products: Array<{ name: string; price: number; url: string }> = []

        try {
            const container = document.querySelector(SELECTORS.frequentlyBought.split(',')[0].trim())
            if (container) {
                const productCards = container.querySelectorAll('.product-card, .bundle-item')
                productCards.forEach(card => {
                    const name = card.querySelector('.product-name, .item-name')?.textContent?.trim() || ''
                    const priceText = card.querySelector('.product-price, .item-price')?.textContent?.trim() || ''
                    const price = parsePrice(priceText) || 0
                    const linkEl = card.querySelector('a') as HTMLAnchorElement | null
                    const url = linkEl?.href || ''

                    if (name && price > 0 && url) {
                        products.push({ name, price, url })
                    }
                })
            }
        } catch {
            // Silent fail
        }

        return products.length > 0 ? products.slice(0, 5) : null
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
                        const result: Partial<TrendyolProductData> = {}

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
        } catch (error) {
            console.error('[SKY] JSON-LD error:', error)
        }
        return null
    }

    function parseProductData(): TrendyolProductData | null {
        console.log(LOG_PREFIX, '🚀 Starting BULLETPROOF ultra-deep parsing...')

        // 1. Try JSON-LD first (Most robust)
        const jsonLdData = getJsonLdProduct()
        console.log(LOG_PREFIX, '  ├─ JSON-LD fallback:', jsonLdData ? 'Available ✓' : 'Not found')

        // BASIC INFO
        const contentId = extractContentId()
        if (!contentId) {
            console.error('%c[SKY QA ERROR] Content ID extraction FAILED - URL pattern invalid', 'background: red; color: white; font-weight: bold; padding: 4px;')
        }
        console.log(LOG_PREFIX, '  ├─ Content ID:', contentId || 'MISSING')

        // CRITICAL: Price with multi-layer fallback
        let currentPrice: number | null | undefined = jsonLdData?.currentPrice
        let priceStrategy = 'JSON-LD'

        if (!currentPrice) {
            const priceText = selectTexts(SELECTORS.currentPrice)
            currentPrice = parsePrice(priceText)
            priceStrategy = 'CSS Selector'

            if (!currentPrice) {
                console.error('%c[SKY QA ERROR] PRICE PARSING FAILED', 'background: red; color: white; font-weight: bold; padding: 4px;')
                console.error('[SKY QA ERROR] Strategy exhausted: JSON-LD → CSS Selector → ALL FAILED')
                console.error('[SKY QA ERROR] Price text found:', priceText || 'NULL')
                return null
            }
        }
        console.log(LOG_PREFIX, '  ├─ Price:', currentPrice, 'TL', `(via ${priceStrategy})`)

        // CRITICAL: Product name
        let productName: string | null | undefined = jsonLdData?.productName
        let nameStrategy = 'JSON-LD'

        if (!productName) {
            productName = selectTexts(SELECTORS.productName)
            nameStrategy = 'CSS Selector'

            if (!productName) {
                console.error('%c[SKY QA ERROR] PRODUCT NAME PARSING FAILED', 'background: red; color: white; font-weight: bold; padding: 4px;')
                console.error('[SKY QA ERROR] Strategy exhausted: JSON-LD → CSS Selector → ALL FAILED')
                return null
            }
        }
        console.log(LOG_PREFIX, '  ├─ Product Name:', productName, `(via ${nameStrategy})`)

        let brandName: string | null | undefined = jsonLdData?.brandName
        if (!brandName) {
            brandName = selectTexts(SELECTORS.brandName)
        }

        // Category from breadcrumbs (last meaningful one)
        let category: string | null = null
        const breadcrumbs = document.querySelectorAll(SELECTORS.categoryBreadcrumb.split(',')[0].trim())
        if (breadcrumbs.length > 1) {
            category = breadcrumbs[breadcrumbs.length - 1]?.textContent?.trim() ?? null
        }

        // PRICING
        const origText = selectTexts(SELECTORS.originalPrice)
        const originalPrice = parsePrice(origText)

        let discountPercentage: number | null = null
        const discountText = selectTexts(SELECTORS.discountBadge)
        if (discountText) {
            const match = discountText.match(/(\d+)/)
            if (match) discountPercentage = parseInt(match[1])
        }

        const campaignName = null // Will be extracted from campaign banner if exists

        console.log(LOG_PREFIX, '  ├─ Price:', currentPrice, 'TL', originalPrice ? `(was ${originalPrice})` : '')

        // SELLER INFO
        const sellerInfo = extractSellerInfo()
        let sellerName: string | null | undefined = jsonLdData?.sellerName
        if (!sellerName) {
            sellerName = selectTexts(SELECTORS.sellerName) ?? 'Bilinmeyen Satıcı'
        }
        console.log(LOG_PREFIX, '  ├─ Seller:', sellerName, sellerInfo.sellerId ? `(ID: ${sellerInfo.sellerId})` : '')

        // STOCK & AVAILABILITY - BULLETPROOF
        const isAvailable = checkStockAvailability()
        const stockText = selectTexts(SELECTORS.stockStatus)
        const stockStatus = stockText || (isAvailable ? 'available' : 'out_of_stock')
        const { stockQuantity } = extractEngagementMetrics()
        const { deliveryTime } = extractShippingInfo()

        // REVIEWS & RATING - NULL-SAFE
        let rating: number | null | undefined = jsonLdData?.rating
        if (rating === undefined || rating === null) {
            const ratingText = selectTexts(SELECTORS.ratingScore)
            rating = parseSafeFloat(ratingText)
        }
        // Final NaN guard
        if (rating !== null && isNaN(rating)) {
            console.warn('[SKY QA WARNING] Rating is NaN, setting to null')
            rating = null
        }

        let reviewCount: number | null | undefined = jsonLdData?.reviewCount
        if (reviewCount === undefined || reviewCount === null) {
            const reviewText = selectTexts(SELECTORS.reviewCount)
            reviewCount = parseSafeNumber(reviewText)
        }
        // Final NaN guard
        if (reviewCount !== null && isNaN(reviewCount)) {
            console.warn('[SKY QA WARNING] Review count is NaN, setting to null')
            reviewCount = null
        }

        const { reviewBreakdown, topReviews } = extractReviewData()
        console.log(LOG_PREFIX, '  ├─ Reviews:', reviewCount ?? 0, 'reviews', rating ? `(${rating}★)` : '(No rating)')
        if (topReviews && topReviews.length > 0) {
            console.log(LOG_PREFIX, `  │  └─ Extracted ${topReviews.length} detailed reviews`)
        } else {
            console.log(LOG_PREFIX, '  │  └─ No reviews available (NEW PRODUCT or ZERO REVIEWS)')
        }

        // MEDIA
        let imageUrl: string | null | undefined = jsonLdData?.imageUrl
        if (!imageUrl) {
            const imgEl = document.querySelector(SELECTORS.productImage.split(',')[0].trim()) as HTMLImageElement | null
            imageUrl = imgEl?.src ?? null
        }

        const { allImages, videoUrl } = extractAllImages()
        console.log(LOG_PREFIX, '  ├─ Media:', allImages.length, 'images', videoUrl ? '+ video' : '')

        // VARIANTS
        const variants = extractVariants()
        if (variants) {
            console.log(LOG_PREFIX, `  ├─ Variants: ${variants.length} types found`)
        }

        // SPECIFICATIONS
        const specifications = extractSpecifications()
        if (specifications) {
            console.log(LOG_PREFIX, `  ├─ Specs: ${Object.keys(specifications).length} attributes`)
        }

        // SHIPPING
        const { freeShipping, freeShippingThreshold, shippingCost } = extractShippingInfo()
        console.log(LOG_PREFIX, '  ├─ Shipping:', freeShipping ? 'FREE' : shippingCost ? `${shippingCost} TL` : 'Unknown')

        // ENGAGEMENT
        const { favoriteCount, questionCount } = extractEngagementMetrics()

        // COMPETITION
        const similarProducts = extractSimilarProducts()
        const frequentlyBoughtTogether = extractFrequentlyBought()
        if (similarProducts) {
            console.log(LOG_PREFIX, `  ├─ Similar products: ${similarProducts.length}`)
        }

        console.log(LOG_PREFIX, '✅ BULLETPROOF ultra-deep parsing complete!')
        console.log(LOG_PREFIX, '  └─ Availability:', isAvailable ? '✓ IN STOCK' : '✗ OUT OF STOCK')

        const finalData: TrendyolProductData = {
            // Basic Info
            url: window.location.href,
            contentId,
            productName: productName!,
            brandName,
            category,

            // Pricing
            currentPrice,
            originalPrice: originalPrice !== currentPrice ? originalPrice : null,
            discountPercentage,
            campaignName,

            // Seller
            sellerId: sellerInfo.sellerId,
            sellerName,
            sellerRating: sellerInfo.sellerRating,
            sellerFollowers: sellerInfo.sellerFollowers,
            sellerBadges: sellerInfo.sellerBadges,

            // Stock & Availability
            isAvailable,
            stockStatus,
            stockQuantity,
            deliveryTime,

            // Reviews & Rating - BULLETPROOF: Final NaN check
            rating: rating && !isNaN(rating) ? rating : null,
            reviewCount: reviewCount && !isNaN(reviewCount) ? reviewCount : null,
            reviewBreakdown,
            topReviews,

            // Media
            imageUrl,
            allImages,
            videoUrl,

            // Variants
            variants,

            // Specifications
            specifications,

            // Shipping
            freeShipping,
            freeShippingThreshold,
            shippingCost,

            // Engagement
            favoriteCount,
            questionCount,

            // Competition
            similarProducts,
            frequentlyBoughtTogether,
        }

        // FINAL VALIDATION
        if (!finalData.currentPrice || finalData.currentPrice <= 0) {
            console.error('%c[SKY QA ERROR] FINAL VALIDATION FAILED: Invalid price in final data', 'background: red; color: white; font-weight: bold; padding: 4px;')
            return null
        }

        return finalData
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
    /*  DOM Ready Detection (V1.5.0 - BUG-01 Fix)                       */
    /* ---------------------------------------------------------------- */

    /**
     * Wait for critical DOM elements to be available
     * Uses MutationObserver for dynamic detection + 10s timeout fallback
     */
    function waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
        return new Promise((resolve) => {
            // Check if already exists
            const existing = document.querySelector(selector)
            if (existing) {
                resolve(existing)
                return
            }

            // Set up timeout
            const timer = setTimeout(() => {
                observer.disconnect()
                console.warn(LOG_PREFIX, `Element ${selector} not found within ${timeout}ms`)
                resolve(null)
            }, timeout)

            // Watch for DOM changes
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector)
                if (element) {
                    clearTimeout(timer)
                    observer.disconnect()
                    resolve(element)
                }
            })

            observer.observe(document.body, {
                childList: true,
                subtree: true
            })
        })
    }

    /**
     * Wait for page to be ready by checking for price element
     * This is more reliable than static timeout
     */
    async function waitForPageReady(): Promise<boolean> {
        console.log(LOG_PREFIX, 'Waiting for page to load...')

        // Wait for price element (critical for parsing)
        const priceElement = await waitForElement('.prc-slg, .prc-dsc, .product-price', 10000)

        if (!priceElement) {
            console.error(LOG_PREFIX, 'Price element not found - page may not be fully loaded')
            return false
        }

        console.log(LOG_PREFIX, 'Page ready ✓')
        return true
    }

    /* ---------------------------------------------------------------- */
    /*  Dynamic Variant Detection (MutationObserver)                     */
    /* ---------------------------------------------------------------- */

    let lastParsedPrice: number | null = null
    let variantObserver: MutationObserver | null = null
    let debounceTimer: number | null = null

    function setupVariantWatcher(badge: HTMLElement) {
        console.log(LOG_PREFIX, '🔍 Setting up variant change watcher...')

        // Target price container for changes
        const priceContainer = document.querySelector('.product-price-container, .pr-bx-w, .product-detail-price')
        if (!priceContainer) {
            console.warn(LOG_PREFIX, 'Price container not found, variant watcher disabled')
            return
        }

        variantObserver = new MutationObserver(() => {
            // Debounce: Wait 500ms after last change before re-parsing
            if (debounceTimer) clearTimeout(debounceTimer)

            debounceTimer = window.setTimeout(() => {
                console.log(LOG_PREFIX, '🔄 Variant change detected! Re-parsing...')
                updateBadge(badge, 'scanning', 'Varyant değişti...')

                const newData = parseProductData()
                if (!newData) {
                    updateBadge(badge, 'error', 'Veri okunamadı')
                    return
                }

                // Check if price actually changed
                if (newData.currentPrice === lastParsedPrice) {
                    console.log(LOG_PREFIX, 'Price unchanged, skipping update')
                    return
                }

                lastParsedPrice = newData.currentPrice
                console.log(LOG_PREFIX, '✅ New variant price:', newData.currentPrice, 'TL')
                updateBadge(badge, 'scanning', `${newData.currentPrice} TL`)

                // Send updated data
                chrome.runtime.sendMessage(
                    { type: 'PRICE_DATA', payload: newData },
                    (response: PriceDataResponse) => {
                        if (chrome.runtime.lastError) {
                            console.error(LOG_PREFIX, chrome.runtime.lastError.message)
                            return
                        }

                        if (response.success && response.matchedProductId) {
                            updateBadge(badge, 'success', `${newData.currentPrice} TL → Güncellendi`)
                        } else {
                            updateBadge(badge, 'no-match', response.error || 'Ürün eşleşmedi')
                        }
                    },
                )
            }, 500)
        })

        variantObserver.observe(priceContainer, {
            childList: true,
            subtree: true,
            characterData: true,
        })

        console.log(LOG_PREFIX, '✅ Variant watcher active')
    }

    /* ---------------------------------------------------------------- */
    /*  Main                                                             */
    /* ---------------------------------------------------------------- */

    async function run() {
        console.log(LOG_PREFIX, 'Parser loaded on:', window.location.href)

        // V1.5.0: Dynamic wait instead of static 2000ms
        const ready = await waitForPageReady()
        if (!ready) {
            console.error(LOG_PREFIX, 'Page not ready, skipping parse')
            return
        }

        const badge = createBadge()

        // Parse product data
        const data = parseProductData()
        if (!data) {
            updateBadge(badge, 'error', 'Fiyat bulunamadı')
            return
        }

        lastParsedPrice = data.currentPrice
        console.log(LOG_PREFIX, 'Parsed:', data.productName, '→', data.currentPrice, 'TL')
        updateBadge(badge, 'scanning', `${data.currentPrice} TL`)

        // Setup variant watcher for dynamic price changes
        setupVariantWatcher(badge)

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
