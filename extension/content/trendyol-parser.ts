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
        // Price - Updated for 2026 Trendyol layout
        currentPrice: '.product-price-container .prc-dsc, .product-price-container .prc-slg, .ps-product-price .price, .pr-bx-w .prc-box-sll, .prc-box-sll, .product-price-container',
        originalPrice: '.product-price-container .prc-org, .ps-product-price .original-price',
        discountBadge: '.dsct-bdg, .discount-badge, .product-discount-percentage',

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
        } catch (e) {
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
        const sellerRating = ratingText ? parseFloat(ratingText.replace(',', '.')) : null

        const followersText = selectTexts(SELECTORS.sellerFollowers)
        const sellerFollowers = followersText ? parseInt(followersText.replace(/\D/g, '')) : null

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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
            const match = freeShippingText.match(/(\d+[\.,]?\d*)\s*TL/)
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
        const favoriteCount = favText ? parseInt(favText.replace(/\D/g, '')) : null

        const qText = selectTexts(SELECTORS.questionCount)
        const questionCount = qText ? parseInt(qText.replace(/\D/g, '')) : null

        // Stock quantity - try to extract from text like "Son 5 ürün"
        let stockQuantity: number | null = null
        const stockText = selectTexts(SELECTORS.stockStatus)
        if (stockText) {
            const match = stockText.match(/(\d+)\s*(ürün|adet)/i)
            if (match) stockQuantity = parseInt(match[1])
        }

        return { favoriteCount, questionCount, stockQuantity }
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
        } catch (e) {
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
        } catch (e) {
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
        console.log(LOG_PREFIX, '🚀 Starting ultra-deep parsing...')

        // 1. Try JSON-LD first (Most robust)
        const jsonLdData = getJsonLdProduct()

        // BASIC INFO
        const contentId = extractContentId()
        console.log(LOG_PREFIX, '  ├─ Content ID:', contentId)

        let currentPrice: number | null | undefined = jsonLdData?.currentPrice
        if (!currentPrice) {
            const priceText = selectTexts(SELECTORS.currentPrice)
            currentPrice = parsePrice(priceText)
        }

        if (!currentPrice) {
            console.log(LOG_PREFIX, 'Could not find current price (JSON-LD & CSS failed)')
            return null
        }

        let productName: string | null | undefined = jsonLdData?.productName
        if (!productName) {
            productName = selectTexts(SELECTORS.productName)
        }

        if (!productName) {
            console.log(LOG_PREFIX, 'Could not find product name')
            return null
        }

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

        // STOCK & AVAILABILITY
        const stockText = selectTexts(SELECTORS.stockStatus)
        const stockStatus = stockText || 'available'
        const { stockQuantity } = extractEngagementMetrics()
        const { deliveryTime } = extractShippingInfo()

        // REVIEWS & RATING
        let rating: number | null | undefined = jsonLdData?.rating
        if (rating === undefined || rating === null) {
            const ratingText = selectTexts(SELECTORS.ratingScore)
            rating = ratingText ? parseFloat(ratingText.replace(',', '.')) : null
        }

        let reviewCount: number | null | undefined = jsonLdData?.reviewCount
        if (reviewCount === undefined || reviewCount === null) {
            const reviewText = selectTexts(SELECTORS.reviewCount)
            reviewCount = reviewText ? parseInt(reviewText.replace(/\D/g, ''), 10) : null
        }

        const { reviewBreakdown, topReviews } = extractReviewData()
        console.log(LOG_PREFIX, '  ├─ Reviews:', reviewCount, 'reviews', rating ? `(${rating}★)` : '')
        if (topReviews) {
            console.log(LOG_PREFIX, `  │  └─ Extracted ${topReviews.length} detailed reviews`)
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

        console.log(LOG_PREFIX, '✅ Ultra-deep parsing complete!')

        return {
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
            stockStatus,
            stockQuantity,
            deliveryTime,

            // Reviews & Rating
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
