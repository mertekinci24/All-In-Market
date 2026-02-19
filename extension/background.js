/* ------------------------------------------------------------------ */
/*  Service Worker (Background) — Sky-Market Chrome Extension          */
/*  Handles auth token storage and Supabase REST API calls             */
/* ------------------------------------------------------------------ */
import { insertRow, selectRows, isTokenExpired, refreshToken } from './lib/supabase-rest.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// V2 Gateway Configuration
let GATEWAY_CONFIG = null;

async function fetchGatewayConfig() {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/gateway-config`, {
            method: 'POST', // or GET if enabled
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            GATEWAY_CONFIG = await response.json();
            console.log('[SKY] Sentinel Gateway Config Loaded:', GATEWAY_CONFIG);

            // Version Check
            const manifest = chrome.runtime.getManifest();
            const currentVersion = manifest.version;

            // Simple SemVer check (assuming x.y.z format)
            if (GATEWAY_CONFIG.min_version && currentVersion < GATEWAY_CONFIG.min_version) {
                console.warn('[SKY] Extension Outdated! Min required:', GATEWAY_CONFIG.min_version);
                chrome.action.setBadgeText({ text: 'UPDATE' });
                chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
                // We could also disable functionality or show a notification here
            }
        }
    } catch (e) {
        console.error('[SKY] Failed to fetch Gateway Config:', e);
        // Fallback to defaults if offline?
    }
}

console.log('[SKY] Background Service Worker Starting... v1.2.0-STABLE-' + Date.now());
fetchGatewayConfig(); // Trigger on load

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */
let lastCapture = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
async function getAuth() {
    const result = await chrome.storage.local.get('auth');
    return result.auth ?? null;
}
async function setAuth(auth) {
    await chrome.storage.local.set({ auth });
}
async function ensureValidToken() {
    const auth = await getAuth();
    if (!auth)
        return null;
    if (!isTokenExpired(auth.expiresAt))
        return auth;
    // Token expired → refresh
    console.log('[SKY] Token expired, refreshing...');
    // V1.4.1 Fix: Use global constants to ensure we use the latest keys, not stale stored ones
    const refreshed = await refreshToken(SUPABASE_URL, SUPABASE_ANON_KEY, auth.refreshToken);
    if (!refreshed) {
        console.warn('[SKY] Token refresh failed');
        await chrome.storage.local.remove('auth');
        return null;
    }
    const updated = {
        ...auth,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        // Update stored keys to match current config just in case
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY
    };
    await setAuth(updated);
    return updated;
}
/* ------------------------------------------------------------------ */
/*  Message Handlers                                                   */
/* ------------------------------------------------------------------ */
async function handleAuthToken(msg) {
    const { accessToken, refreshToken: rt, expiresAt, userId } = msg.payload;
    // Use hardcoded config from config.ts
    const supabaseUrl = SUPABASE_URL;
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    // Fetch storeId from Supabase
    let storeId = null;
    try {
        const res = await selectRows('stores', `user_id=eq.${userId}&select=id&limit=1`, { url: supabaseUrl, anonKey: supabaseAnonKey, accessToken });
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            storeId = res.data[0].id;
        }
    }
    catch (err) {
        console.warn('[SKY] Could not fetch storeId:', err);
    }
    const auth = {
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        refreshToken: rt,
        expiresAt,
        userId,
        storeId,
    };
    await setAuth(auth);
    console.log('[SKY] Auth token stored, expiresAt:', expiresAt, 'storeId:', storeId);
    // Update extension badge
    await chrome.action.setBadgeText({ text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    return { success: true };
}
async function handleAuthStatus() {
    const auth = await getAuth();
    if (!auth)
        return { connected: false, userId: null, expiresAt: null };
    const isValid = !isTokenExpired(auth.expiresAt);
    return {
        connected: isValid,
        userId: auth.userId,
        expiresAt: auth.expiresAt,
    };
}
async function getNotificationSettings(auth) {
    if (!auth?.storeId) return null;
    try {
        const res = await selectRows('notification_settings', `store_id=eq.${auth.storeId}&limit=1`, {
            url: auth.supabaseUrl,
            anonKey: auth.supabaseAnonKey,
            accessToken: auth.accessToken
        });
        return res.data?.[0] ?? null;
    } catch (e) {
        console.warn('[SKY] Failed to fetch settings:', e);
        return null;
    }
}

async function handlePriceData(msg) {
    const auth = await ensureValidToken();
    if (!auth) {
        return { success: false, error: 'Not authenticated. Please open Sky-Market Dashboard first.' };
    }
    if (!auth.storeId) {
        return { success: false, error: 'No store found. Please create a store in Dashboard.' };
    }

    // Fetch user settings (with defaults)
    const settings = await getNotificationSettings(auth);
    const stockThreshold = settings?.stock_threshold ?? 10;
    const priceThreshold = settings?.price_change_threshold ?? 5; // Default 5%

    const product = msg.payload;
    // Try to match product by marketplace_url or name
    const config = { url: auth.supabaseUrl, anonKey: auth.supabaseAnonKey, accessToken: auth.accessToken };
    // Try URL match first
    let matchedProductId = null;
    const urlBase = product.url.split('?')[0];
    const urlResult = await selectRows('products', `store_id=eq.${auth.storeId}&marketplace_url=like.*${encodeURIComponent(urlBase.split('/').pop() ?? '')}*&select=id&limit=1`, config);
    if (urlResult.data && Array.isArray(urlResult.data) && urlResult.data.length > 0) {
        matchedProductId = urlResult.data[0].id;
    }

    // --- ANOMALY DETECTION (Strategies) ---
    if (lastCapture && lastCapture.data && lastCapture.data.url === product.url) {
        const prev = lastCapture.data;
        const curr = product;

        // 1. Stockout Risk 
        if (curr.stock && curr.stock < stockThreshold && (prev.stock >= stockThreshold || !prev.stock)) {
            if (settings?.notify_stock_change !== false) {
                await sendTacticalAlert(auth, auth.storeId, 'stockout_risk', curr, { stock: curr.stock, threshold: stockThreshold });
            }
        }

        // 2. Aggressive Price Drop
        const priceDrop = prev.currentPrice - curr.currentPrice;
        const dropPct = (priceDrop / prev.currentPrice) * 100;

        if (dropPct > priceThreshold) {
            if (settings?.notify_price_drop !== false) {
                await sendTacticalAlert(auth, auth.storeId, 'price_war', curr, {
                    oldPrice: prev.currentPrice,
                    newPrice: curr.currentPrice,
                    dropPct: dropPct.toFixed(1) + '%'
                });
            }
        }

        // 3. Review Spike (Simple Session Check)
        const reviewDiff = (curr.reviewCount || 0) - (prev.reviewCount || 0);
        if (reviewDiff >= 5) {
            if (settings?.notify_competitor_change !== false) {
                await sendTacticalAlert(auth, auth.storeId, 'review_spike', curr, { gained: reviewDiff });
            }
        }
    }

    // Store last capture
    lastCapture = { data: product, timestamp: Date.now() };

    // If we found a matching product, insert price snapshot
    if (matchedProductId) {
        const snapshotRes = await insertRow('price_snapshots', {
            product_id: matchedProductId,
            sales_price: product.currentPrice,
            competitor_price: null,
            buy_price: 0,
            snapshot_date: new Date().toISOString().split('T')[0],
        }, config);

        if (snapshotRes.error) {
            console.warn('[SKY] Snapshot insert error:', snapshotRes.error);
            // Don't halt, just warn
        }

        // Also update product's sales_price (and last_scraped checks)
        // ... (existing update logic) ...
        const updateEndpoint = `${auth.supabaseUrl}/rest/v1/products?id=eq.${matchedProductId}`;
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
        });
        console.log('[SKY] Price snapshot saved for product:', matchedProductId);
        return { success: true, matchedProductId };
    }
    // No match found
    return {
        success: false,
        error: 'Ürün Dashboard\'da bulunamadı. Önce ürünü ekleyin.',
    };
}

async function sendTacticalAlert(auth, storeId, type, product, details) {
    try {
        await fetch(`${auth.supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`,
                'apikey': auth.supabaseAnonKey,
            },
            body: JSON.stringify({
                action: 'alert',
                storeId: storeId,
                alertType: type,
                productName: product.productName,
                details: details
            })
        });
        console.log(`[SKY] Sent Alert: ${type}`);
    } catch (e) {
        console.error('[SKY] Alert Failed:', e);
    }
}


async function isBackendReady(auth) {
    try {
        // Simple HEAD request or lightweight POST to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(`${auth.supabaseUrl}/functions/v1/gateway-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`,
                'apikey': auth.supabaseAnonKey,
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (e) {
        console.warn('[SKY] Backend Health Check Failed:', e);
        return false;
    }
}

async function handleBackendHealthCheck() {
    const auth = await ensureValidToken();
    if (!auth) return { success: false, error: 'Auth failed' };
    const ready = await isBackendReady(auth);
    return { success: ready };
}

async function handleAnalyzeReviews(msg) {
    const auth = await ensureValidToken();
    if (!auth) {
        return { success: false, error: 'Oturum acik degil.' };
    }

    // Health Check before heavy lifting
    const healthy = await isBackendReady(auth);
    if (!healthy) {
        return { success: false, error: '⚠️ Analiz servisine ulaşılamıyor (Ağ/VPN kontrol edin).' };
    }

    const { reviews, productName, url } = msg.payload;
    if (!reviews || reviews.length === 0) {
        return { success: false, error: 'Yorum bulunamadi.' };
    }

    // Attempt to extract ASIN from URL if not provided
    // Trendyol URL structure: ...-p-123456...
    let asin = null;
    const match = url.match(/-p-(\d+)/);
    if (match) {
        asin = match[1];
    }

    try {
        const response = await fetch(`${auth.supabaseUrl}/functions/v1/analyze-reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`,
                'apikey': auth.supabaseAnonKey,
            },
            body: JSON.stringify({
                reviews,
                productTitle: productName,
                asin
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Analiz basarisiz oldu');
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[SKY] Analyze Error:', error);
        return {
            success: false,
            error: error.message || String(error),
            stack: error.stack
        };
    }
}
async function handleLastCapture() {
    return {
        data: lastCapture?.data ?? null,
        timestamp: lastCapture?.timestamp ?? null,
    };
}
/* ------------------------------------------------------------------ */
/*  Main Listener                                                      */
/* ------------------------------------------------------------------ */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handler = async () => {
        switch (message.type) {
            case 'AUTH_TOKEN':
                return handleAuthToken(message);
            case 'AUTH_STATUS':
                return handleAuthStatus();
            case 'PRICE_DATA':
                return handlePriceData(message);
            case 'LAST_CAPTURE':
                return handleLastCapture();
            case 'ANALYZE_REVIEWS':
                return handleAnalyzeReviews(message);
            case 'CHECK_BACKEND_HEALTH':
                return handleBackendHealthCheck();
            case 'ANALYZE_PRODUCT':
                return handleAnalyzeProduct(message);
            case 'SERP_DATA':
                return handleSerpData(message);
            case 'ADD_TRACKING':
                return handleAddToTracking(message);
            case 'DOWNLOAD_MEDIA':
                return handleDownloadMedia(message);
            case 'ANALYZE_AND_SAVE':
                return handleAnalyzeAndSave(message);
            case 'LOG_ERROR':
                return handleLogError(message);
            case 'PING':
                return { success: true, message: 'PONG' };
            default:
                console.warn('[SKY] Unknown message:', message.type);
                return { error: 'Unknown message type: ' + message.type };
        }
    };
    handler().then(sendResponse).catch((err) => {
        console.error('[SKY] Handler error:', err);
        sendResponse({ error: err.message });
    });
    return true; // async sendResponse
});

/* ------------------------------------------------------------------ */
/*  V1.4.0: Technical Log Bridge                                       */
/* ------------------------------------------------------------------ */
async function handleLogError(msg) {
    try {
        const { level, source, message, stack, metadata, page_url } = msg.payload || {};
        const manifest = chrome.runtime.getManifest();

        const row = {
            level: level || 'error',
            source: source || 'extension',
            message: message || 'Unknown error',
            stack: stack || null,
            metadata: metadata || {},
            extension_version: manifest.version,
            page_url: page_url || null,
        };

        // V1.4.1 Fix: Use config for insertRow (was missing config parameter → silent crash)
        const auth = await ensureValidToken();
        const config = auth
            ? { url: auth.supabaseUrl, anonKey: auth.supabaseAnonKey, accessToken: auth.accessToken }
            : { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: SUPABASE_ANON_KEY };

        await insertRow('technical_logs', row, config);
        console.log('[SKY] Technical log saved:', row.level, row.message);
        return { success: true };
    } catch (e) {
        // Log bridge must not crash the extension
        console.error('[SKY] Failed to save technical log:', e);
        return { success: false, error: e.message };
    }
}

async function handleAnalyzeAndSave(msg) {
    const auth = await ensureValidToken();
    if (!auth || !auth.storeId) return { success: false, error: 'Oturum açın' };

    const product = msg.payload;
    const { supabaseUrl, supabaseAnonKey, accessToken } = auth;

    try {
        // 1. Get AI Analysis (Review Summary)
        // We reuse the Edge Function existing logic if possible, or just call it here.
        let aiAnalysis = null;
        if (product.reviews && product.reviews.length > 0) {
            try {
                const aiRes = await fetch(`${supabaseUrl}/functions/v1/analyze-reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`, 'apikey': supabaseAnonKey },
                    body: JSON.stringify({ reviews: product.reviews, productTitle: product.productName })
                });
                if (aiRes.ok) {
                    const json = await aiRes.json();
                    aiAnalysis = json.analysis; // Assuming function returns { analysis: ... }
                }
            } catch (e) { console.warn('[SKY] AI Analysis failed, skipping', e); }
        }

        // 2. Calculate Basic Opportunity Score (Simulation)
        // Ideally we'd call analyze-product, but that requires 'products' table entry.
        // We will do a lightweight calc here for the Research Table.
        let score = 5.0;
        if (product.reviewCount < 50) score += 2;
        if (product.rating > 4.0) score += 1;
        if (product.currentPrice && product.currentPrice > 100) score += 1;
        score = Math.min(10, score);

        // 3. Extract ASIN/ID
        const urlObj = new URL(product.url);
        // ...-p-123456...
        const match = product.url.match(/-p-(\d+)/);
        const asin = match ? match[1] : urlObj.pathname.split('-').pop();

        // 4. Insert into product_mining
        const { error } = await insertRow('product_mining', {
            store_id: auth.storeId,
            marketplace: 'Trendyol',
            asin: asin,
            title: product.productName,
            image_url: product.imageUrl,
            current_price: product.currentPrice,
            opportunity_score: score,
            ai_analysis: aiAnalysis, // JSONB
            is_tracked: false
        }, { url: supabaseUrl, anonKey: supabaseAnonKey, accessToken });

        if (error) {
            // If duplicate, maybe update?
            console.warn('[SKY] Insert mining error (might be duplicate):', error);
            // We continue to open the tab anyway
        }

        // 5. Open Dashboard
        const targetUrl = `http://localhost:5173/research?asin=${asin}`;
        chrome.tabs.create({ url: targetUrl });

        return { success: true };

    } catch (e) {
        console.error('[SKY] AnalyzeAndSave Failed:', e);
        return { success: false, error: e.message || String(e) };
    }
}

async function handleDownloadMedia(msg) {
    const { url, filename } = msg.payload;
    if (!url) return { success: false, error: 'No URL' };
    try {
        const downloadId = await chrome.downloads.download({
            url: url,
            filename: filename || 'image.jpg',
            conflictAction: 'uniquify'
        });
        return { success: true, downloadId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function handleAddToTracking(msg) {
    const auth = await ensureValidToken();
    if (!auth || !auth.storeId) {
        return { success: false, error: 'Please login to Dashboard first.' };
    }

    const p = msg.payload;
    const config = { url: auth.supabaseUrl, anonKey: auth.supabaseAnonKey, accessToken: auth.accessToken };

    // 1. Check if already exists
    const urlBase = p.url.split('?')[0];
    const { data: existing } = await selectRows('products', `store_id=eq.${auth.storeId}&marketplace_url=like.*${encodeURIComponent(urlBase.split('/').pop() ?? '')}*&select=id`, config);

    if (existing && existing.length > 0) {
        return { success: true, message: 'Already tracked', id: existing[0].id };
    }

    // 2. Insert new product
    const { data, error } = await insertRow('products', {
        store_id: auth.storeId,
        name: p.productName,
        marketplace_url: p.url,
        image_url: p.imageUrl || '',
        sales_price: p.currentPrice,
        buy_price: p.currentPrice * 0.5, // Default estimate
        category: p.category || 'General'
    }, config);

    if (error) {
        console.error('[SKY] Add Tracking Error:', error);
        return { success: false, error: error };
    }

    // 3. Also add to Opportunity List (Product Mining) for "War Map" visibility
    // Default score calculation
    let score = 5.0;
    if (p.reviewCount < 50) score += 2;
    if (p.rating > 4.0) score += 1;
    score = Math.min(10, score);

    // Extract ASIN
    const urlObj = new URL(p.url);
    const match = p.url.match(/-p-(\d+)/);
    const asin = match ? match[1] : urlObj.pathname.split('-').pop();

    const miningRes = await insertRow('product_mining', {
        store_id: auth.storeId,
        marketplace: 'Trendyol',
        asin: asin,
        title: p.productName,
        image_url: p.imageUrl || '',
        current_price: p.currentPrice,
        opportunity_score: score,
        is_tracked: true // It is now tracked in inventory
    }, config);

    if (miningRes.error) {
        console.warn('[SKY] Added to Inventory but failed to add to Mining list:', miningRes.error);
    } else {
        console.log('[SKY] Product added to both Inventory and Opportunity List.');
    }

    return { success: true, message: 'Product added to tracking and analysis', id: data[0].id };
}

async function handleAnalyzeProduct(msg) {
    const auth = await ensureValidToken();
    if (!auth) return { success: false, error: 'Not authenticated' };

    const product = msg.payload; // { currentPrice, reviewCount, rating, title, url, ... }

    // V1.4.1 Fix: Guard against invalid price (NaN/Infinity prevention)
    if (!product.currentPrice || product.currentPrice <= 0) {
        console.warn('[SKY] Invalid currentPrice:', product.currentPrice, '— skipping analysis');
        return { success: false, error: 'Ürün fiyatı alınamadı. Sayfayı yenileyip tekrar deneyin.' };
    }

    // 1. Try to find existing product in DB (to get precise buy_price / margin)
    let dbProduct = null;
    const urlBase = product.url.split('?')[0];
    // V1.4.1 Fix: Use global constants
    const urlResult = await selectRows('products', `store_id=eq.${auth.storeId}&marketplace_url=like.*${encodeURIComponent(urlBase.split('/').pop() ?? '')}*&select=*&limit=1`, { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, accessToken: auth.accessToken });

    if (urlResult.data && urlResult.data.length > 0) {
        dbProduct = urlResult.data[0];
    }

    // 2. Prepare Metrics for Edge Function
    // If we don't have DB data, we estimate/default
    const buyPrice = dbProduct?.buy_price || Math.max(product.currentPrice * 0.4, 1); // Min 1 TL to prevent division by zero
    const estSales = dbProduct?.est_monthly_sales || 100; // Default placeholder

    // Calculate Margin roughly
    // Revenue = Price - (Price*0.20 Commission) - (15 Shipping) - BuyPrice
    // Simple estimation for now
    const commission = product.currentPrice * 0.20;
    const shipping = 20;
    const profit = product.currentPrice - commission - shipping - buyPrice;
    const netMargin = (profit / product.currentPrice) * 100;
    const roi = (profit / buyPrice) * 100;

    const metrics = {
        netMargin: Number(netMargin.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        estMonthlySales: estSales, // Should be fetched from prediction API usually
        reviewVelocity: 20, // Placeholder
        searchVolume: 5000, // Placeholder
        reviewCount: product.reviewCount || 0,
        sellerCount: 1, // Placeholder
        avgRating: product.rating || 0,
        bsr: 5000, // Placeholder
        returnRate: dbProduct?.return_rate || 2,
        desi: dbProduct?.desi || 2
    };

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.accessToken}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                productId: dbProduct?.id || null, // Null if not in DB
                storeId: auth.storeId, // Required for creation
                metrics,
                rawPriceData: product.rawPriceData || null, // V1.4.0: Raw price candidates for server-side decision
                productMetadata: {
                    url: product.url,
                    name: product.title || product.productName,
                    imageUrl: product.imageUrl,
                    price: product.currentPrice,
                    marketProductId: product.productId // Marketplace ID (e.g., "12345")
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Edge Function Error (Raw):', response.status, errorText);

            // V1.4.1 Fix: Handle Auth Errors specifically
            if (response.status === 401 || response.status === 403) {
                console.warn('[SKY] Auth invalid (401/403), clearing session.');
                await chrome.storage.local.remove('auth');
                return { success: false, error: 'Oturum süresi doldu. Lütfen eklentiyi açıp tekrar giriş yapın (401).' };
            }

            // Try to parse JSON if possible for cleaner message
            let errorMessage = errorText;
            try {
                const json = JSON.parse(errorText);
                errorMessage = json.error || json.message || errorText;
            } catch (e) { /* ignore json parse error */ }

            throw new Error(`Edge ${response.status}: ${errorMessage}`);
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('[SKY] Analyze Product Error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

async function handleSerpData(msg) {
    const auth = await ensureValidToken();
    if (!auth || !auth.storeId) {
        return { success: false, error: 'Auth failed' };
    }

    const { url, results } = msg.payload;
    const config = { url: auth.supabaseUrl, anonKey: auth.supabaseAnonKey, accessToken: auth.accessToken };

    // Extract keyword from URL
    // Trendyol: .../sr?q=keyword...
    let keyword = '';
    try {
        const urlObj = new URL(url);
        keyword = urlObj.searchParams.get('q');
        if (!keyword) {
            // Try path for category pages
            // trendyol.com/laptop-x-c103108
            const pathParts = urlObj.pathname.split('-');
            if (pathParts.includes('x')) {
                // Heuristic: take part before -x- ?
                // For now, let's rely on 'q' or ignore
            }
        }
    } catch (e) { }

    if (!keyword) {
        console.log('[SKY] No keyword found in URL, skipping SERP save');
        return { success: false, error: 'No keyword' };
    }

    keyword = decodeURIComponent(keyword).replace(/\+/g, ' ');

    // Get all tracked products (User's + Competitors that we track)
    // We match by 'external_id' (which should be the Item ID / Barcode from Trendyol)
    // Results from parser give 'productId' (usually the Content ID)
    // Matching strategy:
    // We need to know which 'products' in our DB correspond to these IDs.
    // 'products.external_id' should store the Trendyol Content ID (e.g. 123456)

    // 1. Fetch all products for this store
    const { data: dbProducts } = await selectRows('products', `store_id=eq.${auth.storeId}&select=id,external_id`, config);
    if (!dbProducts || dbProducts.length === 0) {
        return { success: true, message: 'No tracked products to match' };
    }

    const trackedMap = new Map(); // external_id -> product_id
    dbProducts.forEach(p => {
        if (p.external_id) trackedMap.set(p.external_id, p.id);
    });

    let updates = 0;
    // 2. Iterate SERP results
    for (const res of results) {
        // res = { rank, productId, title, price ... }
        if (trackedMap.has(res.productId)) {
            const dbProductId = trackedMap.get(res.productId);

            // Upsert into keyword_tracking
            // We need a unique constraint or just insert a new record?
            // Schema: id, product_id, keyword, rank...
            // If we want history, we insert new. If we want "current status", we update.
            // Requirement: "Reverse Search Term Engineering" implies building a dataset.
            // Let's check if we already track this keyword for this product.

            // Check existing
            const { data: existing } = await selectRows('keyword_tracking', `product_id=eq.${dbProductId}&keyword=eq.${keyword}&select=id`, config);

            if (existing && existing.length > 0) {
                // Update
                const updateUrl = `${auth.supabaseUrl}/rest/v1/keyword_tracking?id=eq.${existing[0].id}`;
                await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': auth.supabaseAnonKey,
                        'Authorization': `Bearer ${auth.accessToken}`,
                    },
                    body: JSON.stringify({
                        rank: res.rank,
                        is_indexed: true,
                        searched_at: new Date().toISOString() // Assuming we might add this column or just use updated_at if triggers exist
                    })
                });
            } else {
                // Insert
                await insertRow('keyword_tracking', {
                    product_id: dbProductId,
                    keyword: keyword,
                    rank: res.rank,
                    is_indexed: true,
                    search_volume_est: 0 // Placeholder
                }, config);
            }
            updates++;
        }
    }

    console.log(`[SKY] Updated keyword ranks for ${updates} products.`);
    return { success: true, updates };
}
/* ------------------------------------------------------------------ */
/*  Install / Startup                                                  */
/* ------------------------------------------------------------------ */
chrome.runtime.onInstalled.addListener(() => {
    console.log('[SKY] Sky-Market Live Intelligence installed');
    chrome.action.setBadgeText({ text: '' });
});
