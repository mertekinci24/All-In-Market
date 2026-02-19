import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { productId, currentRank, reviewVelocity, category, price, title } = await req.json()

        // 1. Initialize Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 2. Check Cache (24h)
        // 2. Check Cache (24h)
        const { data: existing, error: dbError } = await supabaseClient
            .from('market_opportunities')
            .select('est_monthly_sales, seasonality_forecast, forecast_confidence, forecast_generated_at')
            .eq('product_id', productId)
            .maybeSingle()

        if (existing && existing.forecast_generated_at) {
            const generatedAt = new Date(existing.forecast_generated_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);

            if (hoursDiff < 24 && existing.est_monthly_sales > 0) {
                console.log('Returning cached forecast for', productId);
                return new Response(
                    JSON.stringify({
                        est_monthly_sales: existing.est_monthly_sales,
                        seasonality_forecast: existing.seasonality_forecast,
                        forecast_confidence: existing.forecast_confidence,
                        from_cache: true
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // 3. Mathematical Estimation Logic (Power Law)
        // S_est = alpha * e^(-beta * Rank) + gamma * ReviewVelocity
        // Coefficients (Can be tuned by category later, simplifying for now)
        const alpha = 5000; // Base theoretical max for Rank 1
        const beta = 0.0005; // Decay rate
        const gamma = 15;   // Multiplier for review velocity (assuming 1 review ~= 10-20 sales)

        // Safety checks
        const rankVal = currentRank || 10000;
        const velocityVal = reviewVelocity || 0;

        let estMonthlySales = Math.round(
            (alpha * Math.exp(-beta * rankVal)) + (gamma * velocityVal)
        );

        // Cap min/max based on reasonable category expectations
        if (estMonthlySales < 0) estMonthlySales = 0;

        // 2. Generate Forecast with Gemini 2.0
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
    You are an Econometrics Engine for E-Commerce.
    Context:
    Product: "${title}"
    Category: "${category}"
    Price: ${price} TRY
    Current Rank: ${rankVal}
    Review Velocity: ${velocityVal} reviews/month
    Estimated Baseline Sales: ${estMonthlySales} units/month
    Current Date: ${new Date().toISOString().split('T')[0]}

    Task:
    1. Analyze the seasonality of this product category in Turkey.
    2. Predict the sales trend for the next 30 days.
    3. Provide a confidence score (0-100) based on how predictable this category is (e.g. Swimsuits in winter = predictable low, Fashion trends = low confidence).
    
    Output JSON ONLY:
    {
        "forecast": [
             {"date": "YYYY-MM-DD", "value": 120, "reason": "Weekend spike"},
             ... (next 30 days)
        ],
        "confidence_score": 85,
        "market_note": "Short insight like 'Winter season approaching, expecting 20% drop'"
    }
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean potential markdown code blocks
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJson);

        // 5. Update Database
        await supabaseClient
            .from('market_opportunities')
            .update({
                est_monthly_sales: estMonthlySales,
                seasonality_forecast: aiData.forecast,
                forecast_confidence: aiData.confidence_score,
                ai_insight: aiData.market_note, // Updating the general insight or append? Let's overwrite for now or use a specific column if we had one.
                forecast_generated_at: new Date().toISOString()
            })
            .eq('product_id', productId);

        return new Response(
            JSON.stringify({
                est_monthly_sales: estMonthlySales,
                seasonality_forecast: aiData.forecast,
                forecast_confidence: aiData.confidence_score,
                from_cache: false
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
