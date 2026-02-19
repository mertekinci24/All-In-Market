"use strict";
/* ------------------------------------------------------------------ */
/*  Trendyol Product Parser — Content Script                           */
/*  Runs on Trendyol product pages (trendyol.com product URLs)         */
/* ------------------------------------------------------------------ */

(async function trendyolParser() {
    // LOUD DEBUG LOG
    console.log('%c [SKY] PARSER BAŞLATILDI - Lütfen bu mesajı görüyor musunuz?', 'background: #00b26e; color: white; font-size: 16px; padding: 4px; border-radius: 4px;');
    const LOG_PREFIX = '[SKY Parser]';

    // Check if valid product page (-p- implies product)
    if (!window.location.href.includes('-p-')) {
        console.log(LOG_PREFIX, 'Not a product page (no -p- in URL), skipping.');
        return;
    }

    const PAGE_TYPE = {
        PRODUCT: 'product',
        REVIEWS: 'reviews',
        QA: 'qa'
    };

    function getPageType() {
        if (window.location.href.includes('/yorumlar')) return PAGE_TYPE.REVIEWS;
        if (window.location.href.includes('/saticiya-sor')) return PAGE_TYPE.QA;
        return PAGE_TYPE.PRODUCT;
    }

    const currentPageType = getPageType();
    console.log(LOG_PREFIX, 'Detected Page Type:', currentPageType);

    /* ---------------------------------------------------------------- */
    /*  Configurable DOM Selectors (easy to update if Trendyol changes) */
    /* ---------------------------------------------------------------- */
    const SELECTORS = {
        // Price - Updated for 2026 Trendyol layout
        // Priority: 1. Campaign/Basket Price (Green), 2. Discounted Price (Big Orange), 3. Selling Price (Standard)
        currentPrice: '.prc-box-sll, .prc-dsc, .prc-slg, .product-price-container .price, .product-price-container',
        originalPrice: '.prc-org, .original-price, .product-price-container .prc-org',
        // Product name
        productName: '.pr-new-br h1.pr-new-br span, h1.pr-new-br, .product-detail-name',
        // Seller
        sellerName: '.merchant-text a, .seller-name-text, a[class*="merchant"]',
        // Category breadcrumb
        categoryBreadcrumb: '.breadcrumb-wrapper a, [data-testid="breadcrumb"] a',
        // Image
        productImage: '.product-slide img, .base-product-image img, .gallery-modal-content img, img.ph-gl-img',
        // Rating
        ratingScore: '.pr-rnr-sm .tltp-avg, .rating-score',
        reviewCount: '.pr-rnr-sm .rnr-cm-cnt, .total-review-count',
        // Brand
        brandName: '.pr-new-br a, .product-brand-name-with-link a',
        // Reviews
        reviewText: '.rnr-com-w, .comment, .review-text, .rnr-com-tx, .comment-text, .g-comment-body, [data-testid="comment-text"], [data-testid="review-comment"]'
    };

    /* ---------------------------------------------------------------- */
    /*  V1.4.0: Product Data Contract (Schema Validator)                  */
    /* ---------------------------------------------------------------- */
    const PRODUCT_SCHEMA = {
        required: ['productName', 'currentPrice', 'url'],
        rules: {
            productName: v => typeof v === 'string' && v.length > 2 && v !== 'Ürün Adı Bulunamadı',
            currentPrice: v => typeof v === 'number' && v > 0,
            url: v => typeof v === 'string' && v.startsWith('http'),
        }
    };

    function validateProductData(data) {
        const errors = [];
        for (const field of PRODUCT_SCHEMA.required) {
            if (data[field] === undefined || data[field] === null) {
                errors.push(`Missing required field: ${field}`);
            } else if (PRODUCT_SCHEMA.rules[field] && !PRODUCT_SCHEMA.rules[field](data[field])) {
                errors.push(`Invalid value for ${field}: ${JSON.stringify(data[field])}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }

    function logSchemaError(errors, rawData) {
        try {
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage({
                    type: 'LOG_ERROR', payload: {
                        level: 'error',
                        source: 'parser.schema',
                        message: `ProductSchema validation failed: ${errors.join('; ')}`,
                        stack: null,
                        metadata: { errors, rawSnapshot: { name: rawData.productName, price: rawData.currentPrice, url: rawData.url } },
                        page_url: window.location?.href || 'unknown',
                    }
                }, () => { if (chrome.runtime.lastError) { /* no-op */ } });
            }
        } catch (_) { /* must not throw */ }
    }

    /* ---------------------------------------------------------------- */
    /*  Deep Scan Helpers                                                 */
    /* ---------------------------------------------------------------- */
    function findKeyRecursive(obj, targetKey) {
        if (!obj || typeof obj !== 'object') return null;

        if (obj[targetKey]) return obj[targetKey];

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const result = findKeyRecursive(obj[key], targetKey);
                if (result) return result;
            }
        }
        return null;
    }

    /* ---------------------------------------------------------------- */
    /*  Parser Functions                                                 */
    /* ---------------------------------------------------------------- */
    function parsePrice(text) {
        if (!text)
            return null;
        // Trendyol formats: "1.299,99 TL" or "₺1.299,99"
        const cleaned = text
            .replace(/[^\d.,]/g, '') // Remove everything except digits, dots, commas
            .replace(/\./g, '') // Remove thousand separators
            .replace(',', '.'); // Convert decimal comma to dot
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
    function selectText(selector) {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() ?? null;
    }
    function selectTexts(selectors) {
        // Try each comma-separated selector
        for (const sel of selectors.split(',')) {
            const text = selectText(sel.trim());
            if (text)
                return text;
        }
        return null;
    }
    function getJsonLdProduct() {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
                const content = script.textContent || '{}';
                // Some scripts might be empty or invalid
                if (!content.trim())
                    continue;
                const json = JSON.parse(content);
                const items = Array.isArray(json) ? json : [json];
                for (const item of items) {
                    if (item['@type'] === 'Product') {
                        const result = {};
                        // Name
                        if (item.name)
                            result.productName = item.name;
                        // Image
                        if (item.image) {
                            if (Array.isArray(item.image))
                                result.imageUrl = item.image[0];
                            else if (typeof item.image === 'string')
                                result.imageUrl = item.image;
                            else if (item.image.url)
                                result.imageUrl = item.image.url;
                        }
                        // Brand
                        if (item.brand) {
                            if (typeof item.brand === 'string')
                                result.brandName = item.brand;
                            else if (item.brand.name)
                                result.brandName = item.brand.name;
                        }
                        // Rating
                        if (item.aggregateRating) {
                            if (item.aggregateRating.ratingValue)
                                result.rating = parseFloat(item.aggregateRating.ratingValue);
                            if (item.aggregateRating.reviewCount)
                                result.reviewCount = parseInt(item.aggregateRating.reviewCount);
                        }
                        // Offers (Price & Seller)
                        if (item.offers) {
                            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                            for (const offer of offers) {
                                // Price
                                if (offer.price)
                                    result.currentPrice = parseFloat(offer.price);
                                else if (offer.lowPrice)
                                    result.currentPrice = parseFloat(offer.lowPrice);
                                // Seller
                                if (offer.seller) {
                                    if (typeof offer.seller === 'string')
                                        result.sellerName = offer.seller;
                                    else if (offer.seller.name)
                                        result.sellerName = offer.seller.name;
                                }
                                if (result.currentPrice)
                                    break;
                            }
                        }
                        // If we found at least price, return this candidate
                        if (result.currentPrice) {
                            return result;
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error('[SKY] JSON-LD error:', e);
        }
        return null;
    }

    function parseSocialProof() {
        const proof = {
            cartCount: null,
            viewCount: null,
            favCount: null
        };

        try {
            // Find all potential text containers
            // We search in spans and divs that might contain these specific phrases
            const sensitiveElements = document.querySelectorAll('.product-detail-app-container span, .product-detail-app-container div, .social-proof-text');

            for (const el of sensitiveElements) {
                const text = el.textContent || '';

                // "4,4B kişinin sepetinde"
                if (text.includes('kişinin sepetinde')) {
                    proof.cartCount = text.trim();
                }

                // "7,4B kişi görüntüledi"
                if (text.includes('kişi görüntüledi')) {
                    proof.viewCount = text.trim();
                }

                // "44,3B kişi favoriledi"
                if (text.includes('kişi favoriledi')) {
                    proof.favCount = text.trim();
                }
            }

            // Fallback: If not found in specific containers, search body text (risky but needed if class names change)
            if (!proof.cartCount || !proof.viewCount || !proof.favCount) {
                const bodyText = document.body.innerText;
                const cartMatch = bodyText.match(/([0-9.,]+[BKM]?)\s+kişinin sepetinde/);
                const viewMatch = bodyText.match(/([0-9.,]+[BKM]?)\s+kişi görüntüledi/);
                const favMatch = bodyText.match(/([0-9.,]+[BKM]?)\s+kişi favoriledi/);

                if (!proof.cartCount && cartMatch) proof.cartCount = cartMatch[0];
                if (!proof.viewCount && viewMatch) proof.viewCount = viewMatch[0];
                if (!proof.favCount && favMatch) proof.favCount = favMatch[0];
            }

        } catch (e) {
            console.error(LOG_PREFIX, 'Social Proof Parse Error:', e);
        }

        return proof;
    }

    function parseVariants() {
        try {
            // Pattern 1: Standard Size Dropdown/List (.sp-itm, .variant-item)
            // Trendyol often uses a list of divs for sizes
            let sizeElements = Array.from(document.querySelectorAll('.sp-itm, .variant-item, .size-variant-item, .slc-opt'));

            // Pattern 2: Hidden Select or specific beautified attributes
            if (sizeElements.length === 0) {
                sizeElements = Array.from(document.querySelectorAll('[data-beautify-size], .vrnt-item'));
            }

            const variants = sizeElements.map(el => {
                const text = el.innerText.trim();
                const isOOS = el.classList.contains('out-of-stock') || el.classList.contains('disabled') || el.classList.contains('passive');
                return {
                    size: text.replace('(Tükendi)', '').trim(),
                    inStock: !isOOS,
                    // If price differs per variant, it's harder to catch without clicking, 
                    // but sometimes it's in a data attribute. For now, assume base price.
                };
            }).filter(v => v.size); // Filter empty

            return {
                total: variants.length,
                available: variants.filter(v => v.inStock).length,
                items: variants // Send full list for detailed debugging if needed
            };
        } catch (e) {
            console.error(LOG_PREFIX, 'Variant Parse Error:', e);
            return { total: 0, available: 0, items: [] };
        }
    }

    function parsePriceHistory() {
        const allText = document.body.innerText;
        return {
            lowestPrice30Days: allText.includes('Son 30 Günün En Düşük Fiyatı'),
            // Try to find the specific value if possible
            lowestPriceValue: document.querySelector('.lowest-price-in-30-days')?.innerText.trim() || null
        };
    }

    function parseBasketPrice() {
        try {
            // Strategy 1: The Green Box (.prc-box-sll)
            // This box explicitly appears when there is a 'Sepette' discount.
            // We trust whatever price is inside this box.
            const greenBox = document.querySelector('.prc-box-sll');
            if (greenBox) {
                const text = greenBox.innerText;
                const match = text.match(/([\d.,]+)\s*TL/i);
                if (match) {
                    console.log(LOG_PREFIX, 'Found price in Green Box (.prc-box-sll):', match[1]);
                    return parsePrice(match[1]);
                }
            }

            // Strategy 2: Look for 'Sepette' keyword in other price containers
            // This helps if the class name changes but the text remains.
            // also checking .discounted which is common on some layouts
            const candidates = document.querySelectorAll('.prc-dsc, .product-price-container, .campaign-price, .discounted, .price-wrapper');
            for (const el of candidates) {
                const text = el.innerText;
                if (text.toLowerCase().includes('sepette')) {
                    const match = text.match(/([\d.,]+)\s*TL/i);
                    if (match) {
                        console.log(LOG_PREFIX, 'Found "Sepette" price in generic container:', match[1]);
                        return parsePrice(match[1]);
                    }
                }
            }

            return null;
        } catch (e) {
            console.error(LOG_PREFIX, 'Error parsing basket price:', e);
            return null;
        }
    }

    function parseLocalReviews(root = document) {
        try {
            const reviewElements = root.querySelectorAll(SELECTORS.reviewText);
            const reviews = [];
            for (const el of reviewElements) {
                const text = el.textContent?.trim();
                if (text && text.length > 10) {
                    reviews.push(text);
                }
                if (reviews.length >= 20) break; // Limit to 20 reviews
            }
            return reviews;
        } catch (e) {
            console.error('[SKY] Error parsing reviews:', e);
            return [];
        }
    }

    async function fetchDeepReviews() {
        try {
            // Construct comments URL safely using URL API
            // Fixes bug where /yorumlar could be appended twice
            const currentUrl = new URL(window.location.href);
            // If already on /yorumlar, use it. If not, append it.
            // We assume -p- structure is present.
            let commentsUrl = currentUrl.href;
            if (!currentUrl.pathname.endsWith('/yorumlar')) {
                // Remove query params for cleaner URL, or keep them?
                // Safer to just append to pathname
                currentUrl.pathname = currentUrl.pathname.replace(/\/$/, '') + '/yorumlar';
                commentsUrl = currentUrl.href;
            }


            console.log(LOG_PREFIX, 'Fetching Deep Reviews from:', commentsUrl);

            // Note: Content scripts generally inherit the cookies/auth of the main page,
            // so we don't need to manually set User-Agent (and can't).
            // We just need to make sure we treat the response as text/html.
            const response = await fetch(commentsUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    // 'User-Agent': ... // Forbidden header in fetch
                }
            });

            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);

            const html = await response.text();

            // Parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Debug: Check if we got the page content
            // Trendyol sometimes renders empty shells for bots, but since we are in the browser
            // we should get the client-rendered shell.
            // However, Trendyol is an SPA. The /yorumlar page might also need JS to render.
            // If fetch returns just the skeleton, we might fail to find reviews in the raw HTML response.
            // If that's the case, we might need to rely on the API they call, OR just try to find JSON in the response.

            let deepReviews = parseLocalReviews(doc);

            // Fallback: Regex on Raw HTML (if DOM parsing failed to find elements)
            if (deepReviews.length === 0) {
                console.log(LOG_PREFIX, 'DOM parsing yielded 0 reviews. Attempting Regex fallback...');

                // Strategy 1: Match "text":"..." pattern common in props
                // We look for text that is likely a review (longer than 10 chars)
                // We use a non-greedy capture that avoids ending quotes, but handles escaped quotes?
                // JSON strings escape quotes as \", so [^"] might stop early if there is an escaped quote.
                // Better regex: "text"\s*:\s*"((?:[^"\\]|\\.)*)"
                const commentRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

                let match;
                while ((match = commentRegex.exec(html)) !== null) {
                    try {
                        // match[1] is the content, potentially with \uXXXX and \"
                        // We can use JSON.parse(`"${match[1]}"`) to decode it safely
                        const content = JSON.parse(`"${match[1]}"`);

                        // Filter junk
                        if (content && typeof content === 'string' &&
                            !content.includes('<') &&
                            !content.includes('>') &&
                            content.length > 15 && /* slightly stricter length */
                            !content.match(/^[0-9]+$/)) { /* not just numbers */

                            deepReviews.push(content);
                        }
                    } catch (e) { } // Ignore parse errors

                    if (deepReviews.length >= 20) break;
                }

                // Strategy 2: "commentBody":"..."
                if (deepReviews.length === 0) {
                    const bodyRegex = /"commentBody"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
                    while ((match = bodyRegex.exec(html)) !== null) {
                        try {
                            const content = JSON.parse(`"${match[1]}"`);
                            if (content && content.length > 15) deepReviews.push(content);
                        } catch (e) { }
                        if (deepReviews.length >= 20) break;
                    }
                }

                // Strategy 3: Parse full __SEARCH_APP_INITIAL_STATE__ or __PRODUCT_DETAIL_APP_INITIAL_STATE__
                if (deepReviews.length === 0) {
                    console.log(LOG_PREFIX, 'Regex failed. Attempting full JSON state parsing...');
                    // Look for script containing "window.__SEARCH_APP_INITIAL_STATE__ ="
                    // or just a large JSON object in a script tag that contains "reviews"

                    const scriptRegex = /window\.__PRODUCT_DETAIL_APP_INITIAL_STATE__\s*=\s*({.+?});/s;
                    const scriptMatch = html.match(scriptRegex);
                    if (scriptMatch && scriptMatch[1]) {
                        try {
                            const state = JSON.parse(scriptMatch[1]);
                            // Traverse: product -> reviews ? or just look for reviews array
                            // Usually under state.product.reviews or state.reviews
                            // This structure varies, so we might need to search the object
                            // Simplest way: JSON.stringify the state and regex that, but that's memory heavy.
                            // Let's try to find reviews property if standard path exists.
                            // Common Trendyol path: product.reviews.reviews or similar.

                            // If we can't find exact path easily, let's just re-use the JSON string we found 
                            // and run the regex on IT, which is safer than raw HTML.
                            const jsonString = scriptMatch[1];
                            while ((match = commentRegex.exec(jsonString)) !== null) {
                                try {
                                    const content = JSON.parse(`"${match[1]}"`);
                                    if (content && content.length > 15 && !content.includes('<')) {
                                        deepReviews.push(content);
                                    }
                                } catch (e) { }
                                if (deepReviews.length >= 20) break;
                            }
                        } catch (e) {
                            console.warn('[SKY] State parsing error:', e);
                        }
                    }
                }

                // Strategy 4: Nuclear Option - Scan for any long string in quotes that contains valid Turkish words
                // This is a last resort to find content even if keys are obfuscated
                if (deepReviews.length === 0) {
                    console.log(LOG_PREFIX, 'JSON State failed. Attempting Nuclear Regex...');
                    // Match: "Any text longer than 20 chars"
                    // We intentionally permit escaped quotes
                    const nuclearRegex = /"((?:[^"\\]|\\.)*)"/g;
                    let match;
                    let attempts = 0;
                    // Heuristic keywords to identify reviews
                    const reviewKeywords = ['ürün', 'kailite', 'güzel', 'beğen', 'tavsiye', 'paket', 'hızlı', 'teşekkür', 'sorun', 'iade'];

                    while ((match = nuclearRegex.exec(html)) !== null && attempts < 10000) {
                        attempts++;
                        const content = match[1];
                        if (content.length > 20 && content.length < 500) {
                            // Check for keywords
                            const lower = content.toLowerCase();
                            if (reviewKeywords.some(kw => lower.includes(kw))) {
                                // Basic cleanup
                                if (!content.includes('<') && !content.includes('{') && !content.startsWith('http')) {
                                    try {
                                        // Clean confirm it's a string
                                        const clean = JSON.parse(`"${content}"`);
                                        deepReviews.push(clean);
                                    } catch (e) { deepReviews.push(content); }
                                }
                            }
                        }
                        if (deepReviews.length >= 15) break;
                    }
                }
            }

            console.log(LOG_PREFIX, `Deep crawl found ${deepReviews.length} reviews.`);
            return deepReviews;

        } catch (e) {
            console.warn('[SKY] Deep crawl failed:', e);
            throw e; // Rethrow to be caught by caller
        }
    }

    // V1.4.1: DNA Extraction (Armor - Multi-Source + PuzzleJs)
    function getInitialState() {
        const state = {};
        try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent;
                if (!content) continue;

                // Strategy 1: __PRODUCT_DETAIL_APP_INITIAL_STATE__ (Legacy)
                if (content.includes('__PRODUCT_DETAIL_APP_INITIAL_STATE__')) {
                    try {
                        const extracted = extractJSONAfterKey(content, '__PRODUCT_DETAIL_APP_INITIAL_STATE__');
                        if (extracted) {
                            state.productDetail = extracted;
                            console.log(LOG_PREFIX, 'DNA Found: __PRODUCT_DETAIL_APP_INITIAL_STATE__');
                        }
                    } catch (e) { console.warn(LOG_PREFIX, 'Failed to parse PRODUCT_DETAIL:', e.message); }
                }

                // Strategy 2: __PRODUCT_ACTIONS_APP_INITIAL_STATE__
                if (content.includes('__PRODUCT_ACTIONS_APP_INITIAL_STATE__')) {
                    try {
                        const extracted = extractJSONAfterKey(content, '__PRODUCT_ACTIONS_APP_INITIAL_STATE__');
                        if (extracted) state.productActions = extracted;
                    } catch (e) { /* skip */ }
                }

                // Strategy 3: __SEARCH_APP_INITIAL_STATE__
                if (content.includes('__SEARCH_APP_INITIAL_STATE__')) {
                    try {
                        const extracted = extractJSONAfterKey(content, '__SEARCH_APP_INITIAL_STATE__');
                        if (extracted) state.searchApp = extracted;
                    } catch (e) { /* skip */ }
                }

                // Strategy 6: PuzzleJs __PRODUCT_DETAIL__DATALAYER (Current Trendyol 2025+)
                if (content.includes('__PRODUCT_DETAIL__DATALAYER')) {
                    try {
                        const extracted = extractJSONAfterKey(content, '__PRODUCT_DETAIL__DATALAYER');
                        if (extracted) {
                            state.puzzleDataLayer = extracted;
                            console.log(LOG_PREFIX, 'DNA Found: PuzzleJs __PRODUCT_DETAIL__DATALAYER');
                        }
                    } catch (e) { console.warn(LOG_PREFIX, 'Failed to parse PuzzleJs DATALAYER:', e.message); }
                }

                // Strategy 6b: PuzzleJs product data via envoy or other fragments
                if (content.includes('PuzzleJs.emit') && content.includes('"product"')) {
                    try {
                        const extracted = extractJSONAfterKey(content, '"product"');
                        if (extracted && (extracted.name || extracted.id)) {
                            state.puzzleProduct = extracted;
                            console.log(LOG_PREFIX, 'DNA Found: PuzzleJs product fragment');
                        }
                    } catch (e) { /* skip */ }
                }
            }

            // Strategy 4: Next.js Data
            if (window.__NEXT_DATA__) {
                state.nextData = window.__NEXT_DATA__;
                console.log(LOG_PREFIX, 'DNA Found: __NEXT_DATA__');
            }

            // Strategy 5: Direct window access (some pages expose it directly)
            if (!state.productDetail && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__) {
                state.productDetail = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__;
                console.log(LOG_PREFIX, 'DNA Found: window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ (direct)');
            }

            // Strategy 7: JSON-LD Structured Data (Always present on Trendyol)
            const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const ld of ldScripts) {
                try {
                    const ldData = JSON.parse(ld.textContent);
                    if (ldData['@type'] === 'Product' || (Array.isArray(ldData) && ldData.some(d => d['@type'] === 'Product'))) {
                        const product = Array.isArray(ldData) ? ldData.find(d => d['@type'] === 'Product') : ldData;
                        state.jsonLd = product;
                        console.log(LOG_PREFIX, 'DNA Found: JSON-LD Product Schema');
                    }
                } catch (e) { /* skip */ }
            }

        } catch (e) {
            console.warn(LOG_PREFIX, 'Failed to parse Initial State:', e);
        }
        return state;
    }

    // V1.4.1: Robust JSON extractor using bracket counting (replaces failing regex)
    function extractJSONAfterKey(scriptContent, key) {
        const idx = scriptContent.indexOf(key);
        if (idx === -1) return null;

        // Find the first '{' after the key assignment
        let start = scriptContent.indexOf('{', idx);
        if (start === -1) return null;

        // Bracket-counting parser to find matching '}'
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = start; i < scriptContent.length; i++) {
            const ch = scriptContent[i];

            if (escapeNext) { escapeNext = false; continue; }
            if (ch === '\\') { escapeNext = true; continue; }

            if (ch === '"' && !escapeNext) { inString = !inString; continue; }

            if (!inString) {
                if (ch === '{') depth++;
                else if (ch === '}') {
                    depth--;
                    if (depth === 0) {
                        const jsonStr = scriptContent.substring(start, i + 1);
                        return JSON.parse(jsonStr);
                    }
                }
            }
        }
        return null;
    }

    async function parseProductData() {
        console.log(LOG_PREFIX, 'Starting Deep Parsing (v5 - Titanium Data-First)...');
        const dna = getInitialState(); // DNA = Initial State
        const productDetail = dna.productDetail?.product || dna.searchApp?.products?.[0]; // Adapt based on actual structure

        // --- 1. Basic Details ---
        // V1.4.1: Multi-source name extraction (PuzzleJs + JSON-LD + Legacy)
        let productName = dna.productDetail?.product?.name ||
            productDetail?.name ||
            dna.puzzleProduct?.name ||                          // PuzzleJs product fragment
            dna.jsonLd?.name ||                                 // JSON-LD structured data
            findKeyRecursive(dna, 'name') ||                    // Deep Scan
            document.querySelector('.product-container h1')?.innerText ||
            document.querySelector('h1.pr-new-br span')?.innerText ||
            document.querySelector('h1.pr-new-br')?.innerText ||
            document.querySelector('.product-name')?.innerText ||
            'Ürün Adı Bulunamadı';

        // Clean up name if it's an object (recursive search might return object if key is 'name' but value is object)
        if (typeof productName === 'object') productName = productName.text || productName.value || 'Ürün Adı Bulunamadı';

        const brand = dna.productDetail?.product?.brand?.name ||
            productDetail?.brand?.name ||
            productDetail?.brand ||
            dna.jsonLd?.brand?.name ||                          // JSON-LD brand
            dna.puzzleDataLayer?.boutique_name ||               // PuzzleJs layer
            document.querySelector('a.brand-name')?.innerText ||
            'Marka Yok';

        // V1.4.1 Fix: Extract Product ID (Critical for Tracking)
        let productId = dna.productDetail?.product?.id ||
            productDetail?.id ||
            dna.puzzleProduct?.id ||
            dna.jsonLd?.productID ||
            dna.jsonLd?.sku ||
            dna.jsonLd?.mpn ||
            dna.puzzleDataLayer?.product_id;

        // Fallback: Extract from URL (e.g., ...-p-123456)
        if (!productId) {
            const urlMatch = window.location.href.match(/-p-(\d+)/);
            if (urlMatch) productId = urlMatch[1];
        }

        // Log DNA success
        if (productName !== 'Ürün Adı Bulunamadı') {
            console.log(LOG_PREFIX, 'DNA Extraction Successful for:', productName);
        } else {
            // V1.4.1 Armor: Extended DOM fallback for product name
            console.warn(LOG_PREFIX, 'DNA Extraction Failed for Name. Trying extended DOM...');
            const nameSelectors = [
                'h1.pr-new-br',
                '.product-container h1',
                '.pr-in-cn h1',
                'h1[class*="title"]',
                'h1[class*="name"]',
                '.product-detail-container h1',
                '[data-testid="product-name"]',
                '.pr-cn-w h1',
                'h1'
            ];
            for (const sel of nameSelectors) {
                const el = document.querySelector(sel);
                if (el && el.innerText?.trim().length > 3) {
                    productName = el.innerText.trim();
                    console.log(LOG_PREFIX, 'DOM Name Recovery from:', sel, '->', productName);
                    break;
                }
            }
        }

        // --- 2. Price (Envoy & Ty-Plus Selectors) ---
        let currentPrice = 0;
        let originalPrice = 0;

        // Priority 1: DNA (JSON) - V1.4.0 DUMB COLLECTOR
        // Rule: Collect ALL price candidates. Backend decides the winner.
        const priceObj = productDetail?.price || dna.productDetail?.product?.price;
        const rawPriceCandidates = {};

        if (priceObj) {
            if (priceObj.discountedPrice?.value) rawPriceCandidates.discountedPrice = priceObj.discountedPrice.value;
            if (priceObj.sellingPrice?.value) rawPriceCandidates.sellingPrice = priceObj.sellingPrice.value;
            if (priceObj.originalPrice?.value) rawPriceCandidates.originalPrice = priceObj.originalPrice.value;
            if (priceObj.buyingPrice?.value) rawPriceCandidates.buyingPrice = priceObj.buyingPrice.value;

            // For overlay display, use sellingPrice or discountedPrice as a reasonable default
            currentPrice = priceObj.discountedPrice?.value || priceObj.sellingPrice?.value || 0;
            originalPrice = priceObj.originalPrice?.value || currentPrice;
        }

        // Priority 1.5: JSON-LD Structured Data (very reliable, always present)
        if (!currentPrice && dna.jsonLd?.offers) {
            const offers = dna.jsonLd.offers;
            const ldPrice = parseFloat(offers.lowPrice || offers.price || 0);
            const ldHighPrice = parseFloat(offers.highPrice || offers.price || 0);
            if (ldPrice > 0) {
                currentPrice = ldPrice;
                originalPrice = ldHighPrice || ldPrice;
                rawPriceCandidates.jsonLdPrice = ldPrice;
                if (ldHighPrice) rawPriceCandidates.jsonLdHighPrice = ldHighPrice;
                console.log(LOG_PREFIX, 'Price from JSON-LD:', ldPrice);
            }
        }

        // Priority 2: Ty-Plus DOM Selectors (Verified)
        if (!currentPrice) {
            const dscEl = document.querySelector('.ty-plus-price-discounted-price'); // 219 TL
            const orgEl = document.querySelector('.ty-plus-price-original-price');   // 469 TL

            if (dscEl) {
                currentPrice = parsePrice(dscEl.innerText);
                if (orgEl) originalPrice = parsePrice(orgEl.innerText);
                else originalPrice = currentPrice;
            } else {
                // Fallback to old selectors (Selling Price)
                const sellingEl = document.querySelector('.prc-box-sll');
                if (sellingEl) {
                    currentPrice = parsePrice(sellingEl.innerText);
                    // Check for strikethrough original
                    const orgFallback = document.querySelector('.prc-org');
                    if (orgFallback) originalPrice = parsePrice(orgFallback.innerText);
                    else originalPrice = currentPrice;
                }
            }
        }

        // Priority 3: V1.4.1 Nuclear Price Fallback — scan ALL visible prices and pick lowest
        if (!currentPrice) {
            try {
                let allPrices = [];

                // Step 1: Targeted DOM selectors (high confidence)
                const preciseSelectors = [
                    '.prc-box-dscntd',  // Discounted price box
                    '.prc-box-sll',     // Selling price box
                    '.prc-org',         // Original/strikethrough price
                ];
                for (const sel of preciseSelectors) {
                    document.querySelectorAll(sel).forEach(el => {
                        const p = parsePrice(el.innerText);
                        if (p && p > 20) allPrices.push(p);  // Min 20 TL to avoid badge numbers
                    });
                }

                // Step 2: Regex fallback — ONLY match "X TL" patterns (the TL suffix is key)
                if (allPrices.length === 0) {
                    const priceRegex = /(\d{2,6}[.,]\d{2})\s*TL/g;  // Require 2+ digits and decimals
                    let match;
                    while ((match = priceRegex.exec(document.body.innerText)) !== null) {
                        const p = parsePrice(match[1]);
                        if (p && p > 20) allPrices.push(p);
                    }
                }

                if (allPrices.length > 0) {
                    currentPrice = Math.min(...allPrices);
                    originalPrice = Math.max(...allPrices);
                    rawPriceCandidates.nuclearLowest = currentPrice;
                    rawPriceCandidates.nuclearHighest = originalPrice;
                    console.log(LOG_PREFIX, 'Nuclear Price Fallback:', currentPrice, '(from', allPrices.length, 'candidates:', allPrices, ')');
                }
            } catch (e) { console.warn(LOG_PREFIX, 'Nuclear price scan failed:', e); }
        }


        // --- 3. Reviews (Envoy & Ty-Plus Selectors) ---
        let reviewCount = 0;
        let rating = 0;

        // Priority 1: DNA (JSON)
        if (productDetail?.ratingScore) {
            reviewCount = productDetail.ratingScore.totalCount || 0;
            rating = productDetail.ratingScore.averageRating || 0;
        } else if (productDetail?.reviewCount) { // Common in Search App state
            reviewCount = productDetail.reviewCount;
            rating = productDetail.ratingScore || 0;
        }

        // Priority 2: Verified DOM Selector
        if (!reviewCount) {
            const countEl = document.querySelector('.reviews-summary-reviews-detail b') ||
                document.querySelector('.total-review-count'); // fallback
            if (countEl) {
                reviewCount = parseInt(countEl.innerText.replace(/\D/g, '')) || 0;
            }
        }

        // Priority 3: Nuclear Regex (Body Scan)
        // Fix for "0 reviews" bug on main product page
        if (!reviewCount) {
            try {
                // Pattern: "1234 Değerlendirme" or "1.234 Yorum"
                const reviewRegex = /([0-9.,]+)\s+(?:Değerlendirme|Yorum)/i;
                const bodyText = document.body.innerText;
                const match = bodyText.match(reviewRegex);
                if (match) {
                    reviewCount = parseInt(match[1].replace(/\./g, '')) || 0;
                    console.log(LOG_PREFIX, 'Review Count found via Nuclear Regex:', reviewCount);
                }
            } catch (e) {
                console.warn(LOG_PREFIX, 'Nuclear Regex for Review Count failed', e);
            }
        }


        // --- 4. Stock Health (Envoy Logic) ---
        let stockHealth = 'N/A';
        let totalMarketStock = 0;

        // Try to get explicit stock from Product Actions (Inventory)
        // Usually strictly hidden, but we check if exposed
        // Fallback to badges

        const addToCartDiv = document.querySelector('.add-to-cart-button div');
        const warningBadge = document.querySelector('.low-stock-warning-badge'); // illustrative

        if (dna.productActions?.socialProof?.text) {
            // e.g. "Hızlı Tükendi"
            if (dna.productActions.socialProof.text.includes('Tükendi')) {
                stockHealth = 'Düşük 🔴';
            }
        }

        if (stockHealth === 'N/A') {
            if (addToCartDiv?.innerText.includes('Tükeniyor')) stockHealth = 'Kritik 🔴';
            else if (document.body.innerText.includes('Sepete Ekle')) stockHealth = 'Mevcut 🟢';
            else if (document.body.innerText.includes('Gelince Haber Ver')) stockHealth = 'Tükendi ⚫';
        }

        // Append specific num if found in listings (rare in Envoy)
        if (productDetail?.listings?.length) {
            let stock = 0;
            productDetail.listings.forEach(l => stock += (l.quantity || 0));
            if (stock > 0) {
                totalMarketStock = stock;
                stockHealth += ` (${stock} adet)`;
            }
        }


        // --- 5. Velocity (Envoy & Badges) ---
        let velocity = 'N/A';
        let velocityScore = 0;

        // Check "Sepetinde" counts from Coupons/Social Proof
        // This is often found in plain text now
        const bodyText = document.body.innerText;

        if (bodyText.includes('Sepetinde') || bodyText.includes('görüntüled')) velocityScore += 1;
        if (bodyText.includes('100+') || bodyText.includes('1000+')) velocityScore += 2;
        if (bodyText.includes('Tükeniyor') || bodyText.includes('Hızlı')) velocityScore += 2;
        if (reviewCount > 500) velocityScore += 2;

        if (velocityScore >= 4) velocity = 'Çok Yüksek 🔥';
        else if (velocityScore >= 2) velocity = 'Yüksek 🚀';
        else velocity = 'Düşük 🐢';


        // --- 6. Social Proof (Enhanced) ---
        const socialProof = parseSocialProof();

        // --- 7. Variants ---
        const variants = parseVariants();
        if (productDetail?.variants) {
            variants.items = productDetail.variants.map(v => ({
                size: v.value || v.attributeValue || 'Tek Ebat',
                inStock: v.inStock,
                price: v.price?.sellingPrice?.value
            }));
            variants.total = variants.items.length;
            variants.available = variants.items.filter(v => v.inStock).length;
        }

        // --- 8. Price History ---
        const priceHistory = parsePriceHistory();

        // --- 9. Reviews (Deep Fetch) ---
        let reviews = [];
        try {
            reviews = await fetchDeepReviews();
        } catch (e) { reviews = parseLocalReviews(); }

        const data = {
            productName,
            brand,
            productId, // V1.4.1: Added for tracking
            currentPrice,
            originalPrice,
            reviewCount,
            rating,
            url: window.location.href,
            image: document.querySelector('.product-image-container img')?.src || productDetail?.images?.[0],
            reviews,

            // V1.4.0: Raw price candidates for backend processing
            rawPriceData: rawPriceCandidates,

            // Palladium/Titanium Metrics
            socialProof,
            variants,
            priceHistory,
            velocity,
            stockHealth,
        };

        // V1.4.0: Data Contract Validation
        const validation = validateProductData(data);
        if (!validation.valid) {
            console.warn(LOG_PREFIX, 'Schema Validation FAILED:', validation.errors);
            logSchemaError(validation.errors, data);
            // Return data with _schemaValid flag so overlay can show degraded state
            data._schemaValid = false;
            data._schemaErrors = validation.errors;
        } else {
            data._schemaValid = true;
        }

        console.log(LOG_PREFIX, 'Parsed Data (V1.4.0 SaaS):', data);
        return data;
    }

    // --- Mutation Observer for dynamic SPA changes ---
    let observer = null;
    let parseTimeout = null;

    function setupMutationObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver((mutations) => {
            // Simple debounce to avoid thrashing
            if (parseTimeout) clearTimeout(parseTimeout);

            // Check if relevant nodes (price, product container) were touched
            const shouldReparse = mutations.some(m => {
                const target = m.target;
                if (target instanceof Element) {
                    return target.closest('.product-price-container') ||
                        target.closest('.prc-box-sll') ||
                        target.closest('.product-container'); // General container
                }
                return false;
            });

            if (shouldReparse) {
                parseTimeout = setTimeout(() => {
                    console.log(LOG_PREFIX, 'DOM Changed (Price/Variant), re-parsing...');
                    parseProductData().then(data => {
                        if (data) {
                            document.dispatchEvent(new CustomEvent('SKY_PRODUCT_DATA_READY', { detail: data }));
                            if (window.SkyParser) window.SkyParser.latestData = data;
                        }
                    }).catch(e => {
                        console.error(LOG_PREFIX, 'Error during re-parse:', e);
                    });
                }, 1000); // 1s debounce to let animations/rendering finish
            }
        });

        // Observe widely to catch variant switching which might replace large chunks
        const targetNode = document.querySelector('.product-detail-container') || document.body;
        if (targetNode) {
            observer.observe(targetNode, {
                childList: true,
                subtree: true,
                characterData: true
            });
            console.log(LOG_PREFIX, 'MutationObserver attached to:', targetNode.className || 'BODY');
        }
    }

    // Expose to window for debugging
    window.SkyParser = {
        parse: parseProductData,
        getPageType: getPageType,
        parseBasketPrice: parseBasketPrice,
        reinit: async () => {
            try {
                const data = await parseProductData();
                if (data) {
                    document.dispatchEvent(new CustomEvent('SKY_PRODUCT_DATA_READY', { detail: data }));
                    window.SkyParser.latestData = data;
                }
                setupMutationObserver();
            } catch (e) {
                console.error(LOG_PREFIX, 'Error during reinit:', e);
            }
        },
        latestData: null
    };

    /* ---------------------------------------------------------------- */
    /*  Main Execution                                                  */
    /* ---------------------------------------------------------------- */
    console.log(LOG_PREFIX, 'Parser loaded on:', window.location.href);

    // --- V1.3.3 Hydration Wait & Execution ---
    function tryParse(attempt = 1) {
        // Double check state
        const state = getInitialState();
        const hasState = Object.keys(state).length > 0;

        // Log attempt
        console.log(LOG_PREFIX, `Hydration Check (Attempt ${attempt}):`, hasState ? 'DNA Found' : 'DNA Waiting...');

        if (hasState) {
            parseProductData().then(data => {
                if (data.productName !== 'Ürün Adı Bulunamadı' && data.currentPrice > 0) {
                    console.log(LOG_PREFIX, 'Initial Parse Success:', data.productName);
                    window.SkyParser.latestData = data;
                    document.dispatchEvent(new CustomEvent('SKY_PRODUCT_DATA_READY', { detail: data }));
                    window.dispatchEvent(new CustomEvent('SKY_PRODUCT_PARSED', { detail: data }));
                    setupMutationObserver();
                } else {
                    // Retry if data looks incomplete (up to 10 attempts / 5 seconds)
                    if (attempt < 10) setTimeout(() => tryParse(attempt + 1), 500);
                    else {
                        console.warn(LOG_PREFIX, 'Hydration Wait Timeout. Dispatching what we have.');
                        window.SkyParser.latestData = data;
                        document.dispatchEvent(new CustomEvent('SKY_PRODUCT_DATA_READY', { detail: data }));
                        setupMutationObserver();
                    }
                }
            });
        } else {
            // State not ready, wait and retry
            if (attempt < 10) setTimeout(() => tryParse(attempt + 1), 500);
            else {
                // Fallback to DOM only if no state after timeout
                console.warn(LOG_PREFIX, 'State not found after retries. Fallback to DOM.');
                parseProductData().then(data => {
                    document.dispatchEvent(new CustomEvent('SKY_PRODUCT_DATA_READY', { detail: data }));
                    setupMutationObserver();
                });
            }
        }
    }

    // Start with a small delay to allow React hydration
    if (document.readyState === 'complete') {
        setTimeout(() => tryParse(1), 300);
    } else {
        window.addEventListener('load', () => setTimeout(() => tryParse(1), 300));
    }

})();

