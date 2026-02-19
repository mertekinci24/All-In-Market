import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Duplicate of OpportunityScoreEngine logic for Edge Runtime ---
// (Ideally shared via a common module, but inline for portability here)
interface ScoreInput {
    netMargin: number
    roi: number
    estMonthlySales: number
    reviewVelocity: number
    searchVolume: number
    reviewCount: number
    sellerCount: number
    avgRating: number
    bsr: number
    returnRate?: number
    desi: number
    commissionRate?: number
    salesPrice?: number
    // Titanium Metrics
    socialProof?: {
        views?: number
        carts?: number
        favorites?: number
    }
    stockHealth?: {
        available: number
        total: number
    }
    priceCompetitiveness?: number // % diff from lower bound
}

class OpportunityScoreEngine {
    private calculateSCurve(value: number, midpoint: number, steepness: number): number {
        return 1 / (1 + Math.exp(-steepness * (value - midpoint)))
    }

    private normalize(value: number, target: number, type: 'higher-better' | 'lower-better', sensitivity: number = 0.5): number {
        const steepness = sensitivity / (target * 0.1 || 1)
        const curve = this.calculateSCurve(value, target, steepness)
        return type === 'higher-better' ? curve : 1 - curve
    }

    public calculate(input: ScoreInput) {
        let score = 0
        const details: Record<string, number> = {}

        // --- 1. Profitability & Economics (30%) ---
        // Margin
        const scoreMargin = this.normalize(input.netMargin, 25, 'higher-better', 0.8) * 10
        score += scoreMargin * 0.10
        details['margin'] = scoreMargin

        // ROI
        const scoreROI = this.normalize(input.roi, 100, 'higher-better', 0.5) * 10
        score += scoreROI * 0.05
        details['roi'] = scoreROI

        // Commission (New) - Lower is better. Target 15%
        const commRate = input.commissionRate ?? 20
        const scoreComm = this.normalize(commRate, 15, 'lower-better', 3) * 10
        score += scoreComm * 0.05
        details['commission'] = scoreComm

        // Ticket Size (New) - Higher Price = Better Abs Profit. Target 500 TL
        const price = input.salesPrice ?? 100
        const scoreTicket = this.normalize(price, 500, 'higher-better', 0.5) * 10
        score += scoreTicket * 0.05
        details['ticket_size'] = scoreTicket

        // Return Rate
        const rRate = input.returnRate ?? 2
        const scoreReturn = this.normalize(rRate, 3, 'lower-better', 2) * 10
        score += scoreReturn * 0.05
        details['return_rate'] = scoreReturn

        // --- 2. Demand & Volume (30%) ---
        // Sales Volume
        const scoreSales = this.normalize(input.estMonthlySales, 300, 'higher-better', 0.5) * 10
        score += scoreSales * 0.05 // Reduced weight to make room for Velocity
        details['sales'] = scoreSales

        // Trend (Review Velocity)
        const scoreTrend = this.normalize(input.reviewVelocity, 20, 'higher-better', 4) * 10
        score += scoreTrend * 0.05
        details['trend'] = scoreTrend

        // Search Volume
        const scoreVol = this.normalize(input.searchVolume, 5000, 'higher-better', 0.5) * 10
        score += scoreVol * 0.05
        details['volume'] = scoreVol

        // Titanium Velocity Score (New)
        // Algo: (Views/100) * ( 1 + Basket/Views )
        let scoreVelocity = 5; // Default neutral
        if (input.socialProof?.views) {
            const views = input.socialProof.views;
            const carts = input.socialProof.carts || 0;
            const rawVelocity = (views / 100) * (1 + (carts / (views || 1)));
            // Normalize raw velocity. Target approx 10 for "High"
            scoreVelocity = this.normalize(rawVelocity, 8, 'higher-better', 1) * 10;
        }
        score += scoreVelocity * 0.15; // High weight
        details['velocity_titanium'] = scoreVelocity;

        // --- 3. Competition & Risk (25%) ---
        // Stock Health (Titanium)
        let scoreStock = 5;
        if (input.stockHealth && input.stockHealth.total > 0) {
            const healthRatio = input.stockHealth.available / input.stockHealth.total;
            // Target 80% availability
            scoreStock = this.normalize(healthRatio * 100, 80, 'higher-better', 1) * 10;
        }
        score += scoreStock * 0.10;
        details['stock_health'] = scoreStock;

        // Price Competitiveness (Arbitrage)
        let scoreArbitrage = 5;
        if (input.priceCompetitiveness !== undefined) {
            // If price is 5% LOWER than competitor (-5), that's good.
            // If price is HIGHER (+), bad.
            // Normalize such that -10% is excellent (10), +10% is poor (0)
            // We invert the input so "higher positive gap" aka "cheaper" is better
            const gap = -input.priceCompetitiveness; // e.g. -(-2.2) = +2.2% advantage
            scoreArbitrage = this.normalize(gap, 0, 'higher-better', 1) * 10;
        }
        score += scoreArbitrage * 0.05;
        details['arbitrage'] = scoreArbitrage;


        // Review Count
        const scoreReviews = this.normalize(input.reviewCount, 50, 'lower-better', 0.5) * 10
        score += scoreReviews * 0.05
        details['competition_strength'] = scoreReviews

        // Rating
        const scoreRating = this.normalize(input.avgRating, 4.2, 'higher-better', 2) * 10
        score += scoreRating * 0.05
        details['rating_quality'] = scoreRating

        // Seller Density
        const scoreDensity = this.normalize(input.sellerCount, 3, 'lower-better', 5) * 10
        score += scoreDensity * 0.05
        details['density'] = scoreDensity

        // Competitiveness (New) - Are we early? Low review count = Early
        const scoreEarly = this.normalize(input.reviewCount, 10, 'lower-better', 2) * 10
        score += scoreEarly * 0.05
        details['competitiveness'] = scoreEarly

        // Brand Dominance (New) - Placeholder: If seller count < 2, assumes dominance
        const scoreBrand = this.normalize(input.sellerCount, 2, 'higher-better', 5) * 10
        score += scoreBrand * 0.10
        details['brand_dominance'] = scoreBrand

        // --- 4. Quality & Logistics (15%) ---
        // Quality (Rating)
        const scoreQuality = this.normalize(input.avgRating, 4.0, 'lower-better', 4) * 10
        score += scoreQuality * 0.05
        details['quality'] = scoreQuality

        // BSR
        const scoreBSR = this.normalize(input.bsr, 2000, 'higher-better', 0.5) * 10
        score += scoreBSR * 0.05
        details['bsr_score'] = scoreBSR

        // Logistics (Desi)
        const scoreDesi = this.normalize(input.desi, 2, 'lower-better', 2) * 10
        score += scoreDesi * 0.05
        details['desi_score'] = scoreDesi


        // Normalize Total Score to 1-10 (Simple sum of weights is 1.0)
        return {
            total: Math.min(10, Math.max(1, Number(score.toFixed(1)))),
            details
        }
    }
}
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// V1.4.0: Server-Side Price Processor ("Smart Brain")
// The extension sends ALL price candidates. We pick the winner.
// ------------------------------------------------------------------
interface RawPriceData {
    discountedPrice?: number
    sellingPrice?: number
    originalPrice?: number
    buyingPrice?: number
}

function processRawPriceData(raw: RawPriceData | undefined): { currentPrice: number, originalPrice: number } {
    if (!raw) return { currentPrice: 0, originalPrice: 0 }

    // Collect all valid prices > 0
    const candidates: number[] = []
    if (raw.discountedPrice && raw.discountedPrice > 0) candidates.push(raw.discountedPrice)
    if (raw.sellingPrice && raw.sellingPrice > 0) candidates.push(raw.sellingPrice)
    if (raw.buyingPrice && raw.buyingPrice > 0) candidates.push(raw.buyingPrice)

    // Lowest price wins (excluding originalPrice from candidates — it's reference only)
    const currentPrice = candidates.length > 0 ? Math.min(...candidates) : (raw.originalPrice || 0)

    // Original price is always the highest for discount display
    const allPrices = [...candidates]
    if (raw.originalPrice && raw.originalPrice > 0) allPrices.push(raw.originalPrice)
    const originalPrice = allPrices.length > 0 ? Math.max(...allPrices) : currentPrice

    return { currentPrice, originalPrice }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {

        const body = await req.json()
        const metrics = body.metrics
        const productMetadata = body.productMetadata
        const storeId = body.storeId
        let productId = body.productId

        // V1.4.1-rc5: Null-safety guard for productMetadata
        if (!productMetadata) {
            console.warn('[V1.4.1] No productMetadata provided, creating minimal stub')
        }
        const safeMetadata = productMetadata || { url: '', name: 'Unknown', imageUrl: '', price: '0', marketProductId: '' }

        // V1.4.0: Server-Side Price Decision
        const rawPriceData = body.rawPriceData as RawPriceData | undefined
        const processedPrice = processRawPriceData(rawPriceData)

        // Override metadata price with server-processed price
        if (processedPrice.currentPrice > 0) {
            safeMetadata.price = String(processedPrice.currentPrice)
            safeMetadata.originalPrice = String(processedPrice.originalPrice)
            console.log(`[V1.4.0] Price Decision: ${processedPrice.currentPrice} (original: ${processedPrice.originalPrice})`)
        }

        if (!metrics) {
            throw new Error('Metrics are required')
        }

        // 1. Calculate Opportunity Score
        const engine = new OpportunityScoreEngine()
        const scoreResult = engine.calculate({
            netMargin: metrics.netMargin,
            roi: metrics.roi,
            estMonthlySales: metrics.estMonthlySales,
            reviewVelocity: metrics.reviewVelocity,
            searchVolume: metrics.searchVolume,
            reviewCount: metrics.reviewCount,
            sellerCount: metrics.sellerCount,
            avgRating: metrics.avgRating,
            bsr: metrics.bsr,
            returnRate: metrics.returnRate,
            desi: metrics.desi,
            commissionRate: metrics.commissionRate, // Ensure this is sent from extension
            salesPrice: parseFloat(safeMetadata.price || '0') // We have this in metadata
        })

        // 2. Generate AI Summary (Gemini 2.0 Flash with Fallback)
        const prompt = `
    Role: Senior E-Commerce Market Analyst (Sky-Market Chief Strategist).
    Task: Analyze this product opportunity based on the calculated score.
    
    Product Metrics:
    - Opportunity Score: ${scoreResult.total}/10
    - Net Margin: %${metrics.netMargin}
    - Est. Sales: ${metrics.estMonthlySales}/mo
    - Content Quality: ${metrics.avgRating}/5 stars
    - Competition: ${metrics.reviewCount} reviews, ${metrics.sellerCount} sellers
    - BSR: ${metrics.bsr}

    The score breakdown: ${JSON.stringify(scoreResult.details)}

    Output specific advice in ONE sentence (Turkish).
    Format: "This product score is X. Why? [Reason], so [Action]."
    Example: "Bu ürünün fırsat skoru 8.2/10. Neden? Çünkü kâr marjın %35 ile mükemmel, ancak pazar liderinin 5000 yorumu var; SEO yerine Influencer trafiğiyle girmelisin."
    `

        let aiInsight = ''

        // Helper to generate content with timeout and error handling
        const generateWithFallback = async (modelName: string) => {
            const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent(prompt)
            return result.response.text().trim()
        }

        try {
            // 1. Try Primary: Gemini 2.0 Flash
            aiInsight = await generateWithFallback('gemini-2.0-flash')
        } catch (error: any) { // Explicitly type error as 'any' or 'unknown' then narrow
            console.warn(`Gemini 2.0 Flash failed (${error.message}), trying fallback...`)
            try {
                // 2. Try Fallback: Gemini 1.5 Flash
                aiInsight = await generateWithFallback('gemini-1.5-flash')
            } catch (fallbackError: any) { // Explicitly type error as 'any' or 'unknown' then narrow
                console.error('Gemini 1.5 Flash also failed:', fallbackError)

                // 3. Return a graceful error that isn't a 500 crash
                // We return a "soft" insight so the UI still works
                if (error.message?.includes('429') || fallbackError.message?.includes('429')) {
                    aiInsight = '⚠️ Kota limiti aşıldı (429). Lütfen 1 dakika bekleyin.'
                } else {
                    aiInsight = 'AI servisi şu an yanıt veremiyor.'
                }
            }
        }

        // 3. Save to Database
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        let dbError = null

        // AUTO-TRACKING Logic:
        // If productId is missing, but we have metadata + storeId, create it!
        if (!productId && safeMetadata.url && storeId) {
            console.log('Product not tracked yet. Attempting auto-creation...', safeMetadata.name)

            // 1. Double check if it exists by URL (avoid race conditions or client sync issues)
            const urlPath = (safeMetadata.url || '').split('?')[0]
            const { data: existingProdFromUrl } = await supabaseClient
                .from('products')
                .select('id')
                .eq('store_id', storeId)
                .ilike('marketplace_url', `%${urlPath || 'NO_MATCH'}%`) // Simple match
                .maybeSingle()

            if (existingProdFromUrl) {
                productId = existingProdFromUrl.id
                console.log('Found existing product by URL:', productId)
            } else {
                // 2. Create new product
                // Estimate buy price as 50% of sales price
                const salesPrice = parseFloat(productMetadata.price || '0')

                const { data: newProd, error: createError } = await supabaseClient
                    .from('products')
                    .insert({
                        store_id: storeId,
                        name: safeMetadata.name || 'Unknown Product',
                        marketplace_url: safeMetadata.url || '',
                        image_url: safeMetadata.imageUrl || '',
                        sales_price: salesPrice,
                        buy_price: salesPrice * 0.5,
                        category: 'Analiz', // Default
                        is_active: true // Track by default
                    })
                    .select('id')
                    .single()

                if (createError) {
                    console.error('Failed to auto-create product:', createError)
                    // We don't throw, we just skip saving opportunity 
                } else if (newProd) {
                    productId = newProd.id
                    console.log('Created new product:', productId)
                }
            }
        }

        if (productId) {
            // Check if opportunity exists for this product
            const { data: existingOpp } = await supabaseClient
                .from('market_opportunities')
                .select('id')
                .eq('product_id', productId)
                .maybeSingle()

            const oppData = {
                opportunity_score: scoreResult.total,
                metrics_json: scoreResult.details,
                ai_insight: aiInsight,
                est_monthly_sales: metrics.estMonthlySales
            }

            if (existingOpp) {
                const { error } = await supabaseClient
                    .from('market_opportunities')
                    .update(oppData)
                    .eq('id', existingOpp.id)
                dbError = error
            } else {
                const { error } = await supabaseClient
                    .from('market_opportunities')
                    .insert({
                        product_id: productId,
                        ...oppData
                    })
                dbError = error
            }

            if (dbError) {
                console.error('DB Error (products):', dbError)
            }
        }

        // 4. Save to Product Mining (For Dashboard "Product Mining" / "Ürün Madenciliği" Menu)
        // This is crucial because the dashboard primarily reads from this table for research.
        if (storeId && safeMetadata.marketProductId) {
            console.log('Saving to product_mining table...')
            const miningData = {
                store_id: storeId,
                marketplace: 'Trendyol',
                asin: safeMetadata.marketProductId,
                title: safeMetadata.name || 'Unknown',
                image_url: safeMetadata.imageUrl || '',
                current_price: parseFloat(safeMetadata.price || '0'),
                opportunity_score: scoreResult.total,
                ai_analysis: {
                    insight: aiInsight,
                    score_details: scoreResult.details,
                    generated_at: new Date().toISOString()
                },
                is_tracked: true
            }

            const { error: miningError } = await supabaseClient
                .from('product_mining')
                .upsert(miningData, {
                    onConflict: 'store_id,marketplace,asin',
                    ignoreDuplicates: false
                })

            if (miningError) {
                console.error('DB Error (product_mining):', miningError)
            } else {
                console.log('Successfully saved to product_mining')
            }
        }

        // We log the error but do not throw it, ensuring the user always gets their score.


        // If there was a DB error AND we were trying to save (productId exists), we might want to throw.
        // However, for the overlay relying on the score, we usually prefer to return the score even if save fails.
        // So we will just log it above and NOT throw, or only throw if strictly required.
        // The previous code did: if (dbError) throw dbError
        // Let's keep it safe: if we have an error, we log it. We return the score regardless.


        return new Response(
            JSON.stringify({
                score: scoreResult.total,
                details: scoreResult.details,
                insight: aiInsight
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
