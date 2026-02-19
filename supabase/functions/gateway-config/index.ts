import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Dynamic Configuration for V2 Clients
        const config = {
            min_version: "1.2.0",
            latest_version: "1.2.0",
            ai_model: "gemini-2.0-flash", // Remotely switchable!
            features: {
                deep_crawl: true,
                auto_sync: true,
                price_tracking: true
            },
            endpoints: {
                // Future proofing: return endpoints if we move them
                analyze: "analyze-reviews",
                product: "analyze-product"
            }
        }

        return new Response(
            JSON.stringify(config),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
