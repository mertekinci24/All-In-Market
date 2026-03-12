import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface ProductContext {
    name: string;
    contentId?: string;
    brandName?: string;
    category?: string;
    currentPrice: number;
    originalPrice?: number;
    rating?: number;
    reviewCount?: number;
    sellerName?: string;
    richData?: {
        review_breakdown?: { five: number; four: number; three: number; two: number; one: number };
        top_reviews?: Array<{ text: string; rating: number }>;
        variants?: Array<{ type: string; options: string[] }>;
        specifications?: Record<string, string>;
        similar_products?: Array<{ name: string; price: number }>;
        [key: string]: unknown;
    };
}

interface ChatRequest {
    message: string;
    productContext?: ProductContext;
    conversationHistory?: ChatMessage[];
}

function buildSystemPrompt(product?: ProductContext): string {
    let prompt = `Sen Sky Market'in yapay zeka ürün danışmanısın. E-ticaret, ürün analizi ve pazar araştırması konusunda uzman bir analistsin.

**Görevin:**
- Satıcılara ürünleri hakkında detaylı, veri odaklı analizler sunmak
- Rekabet analizi, fiyatlandırma stratejisi ve ürün optimizasyonu konularında tavsiyelerde bulunmak
- Müşteri yorumlarını analiz ederek iyileştirme önerileri geliştirmek
- Profesyonel ama samimi bir dille, her seviyeden kullanıcıya hitap etmek

**İletişim Tarzın:**
- Açık, net ve eylem odaklı
- Sayılar ve verilerle desteklenmiş
- Pozitif ama gerçekçi
- Türkçe kullan, teknik terimleri açıkla

**Önemli:**
- Asla uydurma! Sadece verilen verileri kullan
- Emin olmadığın konularda "Bu veri mevcut değil" de
- Her önerini gerekçelendir`;

    if (product) {
        prompt += `\n\n**MEVCUT ÜRÜN ANALİZİ:**\n`;
        prompt += `📦 **${product.name}**\n`;

        if (product.brandName) prompt += `🏷️ Marka: ${product.brandName}\n`;
        if (product.category) prompt += `📁 Kategori: ${product.category}\n`;
        if (product.contentId) prompt += `🆔 Trendyol ID: ${product.contentId}\n`;

        prompt += `\n💰 **Fiyatlandırma:**\n`;
        prompt += `- Güncel Fiyat: ${product.currentPrice.toLocaleString('tr-TR')} TL\n`;
        if (product.originalPrice && product.originalPrice > product.currentPrice) {
            const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice * 100).toFixed(0);
            prompt += `- İndirim: %${discount} (${product.originalPrice.toLocaleString('tr-TR')} TL → ${product.currentPrice.toLocaleString('tr-TR')} TL)\n`;
        }

        if (product.rating || product.reviewCount) {
            prompt += `\n⭐ **Müşteri Geri Bildirimleri:**\n`;
            if (product.rating) prompt += `- Ortalama Puan: ${product.rating}/5.0\n`;
            if (product.reviewCount) prompt += `- Toplam Yorum: ${product.reviewCount}\n`;
        }

        if (product.richData?.review_breakdown) {
            const rb = product.richData.review_breakdown;
            const total = rb.five + rb.four + rb.three + rb.two + rb.one;
            if (total > 0) {
                prompt += `- Yorum Dağılımı:\n`;
                prompt += `  - 5★: ${rb.five} (%${((rb.five/total)*100).toFixed(0)})\n`;
                prompt += `  - 4★: ${rb.four} (%${((rb.four/total)*100).toFixed(0)})\n`;
                prompt += `  - 3★: ${rb.three} (%${((rb.three/total)*100).toFixed(0)})\n`;
                prompt += `  - 2★: ${rb.two} (%${((rb.two/total)*100).toFixed(0)})\n`;
                prompt += `  - 1★: ${rb.one} (%${((rb.one/total)*100).toFixed(0)})\n`;
            }
        }

        if (product.richData?.top_reviews && product.richData.top_reviews.length > 0) {
            prompt += `\n📝 **Örnek Yorumlar:**\n`;
            product.richData.top_reviews.slice(0, 5).forEach((review, i) => {
                prompt += `${i + 1}. [${review.rating}★] "${review.text.slice(0, 150)}${review.text.length > 150 ? '...' : ''}"\n`;
            });
        }

        if (product.richData?.variants && product.richData.variants.length > 0) {
            prompt += `\n🎨 **Varyantlar:**\n`;
            product.richData.variants.forEach(v => {
                prompt += `- ${v.type}: ${v.options.slice(0, 5).join(', ')}${v.options.length > 5 ? ` (+${v.options.length - 5} daha)` : ''}\n`;
            });
        }

        if (product.richData?.specifications) {
            prompt += `\n🔧 **Teknik Özellikler:**\n`;
            const specs = product.richData.specifications;
            Object.entries(specs).slice(0, 8).forEach(([key, value]) => {
                prompt += `- ${key}: ${value}\n`;
            });
        }

        if (product.richData?.similar_products && product.richData.similar_products.length > 0) {
            prompt += `\n🔍 **Benzer Ürünler (Rekabet Analizi):**\n`;
            product.richData.similar_products.slice(0, 5).forEach(p => {
                prompt += `- ${p.name}: ${p.price.toLocaleString('tr-TR')} TL\n`;
            });
        }

        if (product.sellerName) {
            prompt += `\n🏪 **Satıcı:** ${product.sellerName}\n`;
        }
    }

    return prompt;
}

async function callGeminiAPI(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set. Please configure it in Supabase Dashboard.");
    }

    const geminiMessages = [
        {
            role: "user",
            parts: [{ text: systemPrompt }]
        },
        ...messages.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }))
    ];

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: geminiMessages,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        console.error("Gemini API Error:", error);
        throw new Error(`Gemini API failed: ${response.status} ${error}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
    }

    const textContent = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
        throw new Error("Invalid response format from Gemini API");
    }

    return textContent;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const body: ChatRequest = await req.json();
        const { message, productContext, conversationHistory = [] } = body;

        if (!message || typeof message !== "string") {
            return new Response(
                JSON.stringify({ error: "Message is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const systemPrompt = buildSystemPrompt(productContext);

        const conversationMessages: ChatMessage[] = [
            ...conversationHistory,
            { role: "user", content: message }
        ];

        const aiResponse = await callGeminiAPI(conversationMessages, systemPrompt);

        return new Response(
            JSON.stringify({
                success: true,
                response: aiResponse,
                productAnalyzed: !!productContext
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Gemini Chat Error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return new Response(
            JSON.stringify({
                success: false,
                error: errorMessage
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    }
});
