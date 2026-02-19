import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Analyze Reviews function up and running")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { reviews, asin, productTitle } = await req.json()

        if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
            throw new Error('No reviews provided')
        }

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set')
        }

        // Prepare Prompt
        const prompt = `
      Analyze the following customer reviews for the product "${productTitle}".
      Provide a JSON output with the following structure:
      {
        "summary": "A brief summary of the general sentiment and key points (max 2 sentences, in Turkish).",
        "sentiment": {
          "pos": number (percentage of positive sentiment 0-100),
          "neg": number (percentage of negative sentiment 0-100),
          "neu": number (percentage of neutral sentiment 0-100)
        },
        "themes": [
          "Theme 1 (e.g., Kalite, Kargo, Fiyat)",
          "Theme 2",
          ... (max 5 key themes discussed)
        ]
      }
      
      Reviews:
      ${reviews.slice(0, 50).join('\n')}
    `

        // Call Gemini with Fallback Strategy
        const callGemini = async (model: string) => {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            })
            if (!res.ok) throw new Error(res.statusText + ' ' + res.status)
            return res.json()
        }

        let geminiData = null;
        try {
            geminiData = await callGemini('gemini-2.0-flash')
        } catch (e) {
            console.warn('Gemini 2.0 failed:', e)
            try {
                geminiData = await callGemini('gemini-1.5-flash')
            } catch (fallbackError) {
                console.error('Gemini 1.5 failed:', fallbackError)
                // Return dummy structure to prevent crash
                geminiData = {
                    candidates: [{
                        content: { parts: [{ text: '```json\n{"summary": "AI servisi şu an yoğun (Kota). Lütfen daha sonra tekrar deneyin.", "sentiment": {"pos":0,"neg":0,"neu":0}, "themes": []}\n```' }] }
                    }]
                }
            }
        }

        if (!geminiData.candidates || geminiData.candidates.length === 0) {
            console.error('Gemini Error:', JSON.stringify(geminiData));
            throw new Error('Failed to generate analysis from Gemini')
        }

        const textOutput = geminiData.candidates[0].content.parts[0].text
        // Clean code blocks if present
        const jsonString = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
        const analysisResult = JSON.parse(jsonString)

        // Add timestamp
        analysisResult.last_updated = new Date().toISOString()

        // Save to Database if ASIN is provided
        if (asin) {
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // 1. Fetch existing analysis to preserve 'score_details'
            const { data: existingData } = await supabaseClient
                .from('product_mining')
                .select('ai_analysis')
                .eq('asin', asin)
                .maybeSingle()

            const existingAnalysis = existingData?.ai_analysis || {}

            // 2. Merge new review analysis with existing data
            // We want to keep 'score_details' and 'insight' (product analysis)
            // And update 'summary', 'sentiment', 'themes' (review analysis)
            const mergedAnalysis = {
                ...existingAnalysis,
                ...analysisResult, // Overwrites summary, sentiment, themes, last_updated
            }

            const { error: dbError } = await supabaseClient
                .from('product_mining')
                .update({ ai_analysis: mergedAnalysis })
                .eq('asin', asin)

            if (dbError) {
                console.error('DB Error:', dbError)
                // Don't fail the request if DB save fails, just return the data
            }
        }

        return new Response(
            JSON.stringify(analysisResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Critical Error in analyze-reviews:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Unknown error',
                stack: error.stack,
                details: 'Error occurred in analyze-reviews Edge Function'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
