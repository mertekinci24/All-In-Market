import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Client-Info, Apikey",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryInput {
    category: string;
    revenue: number;
    profit: number;
    margin: number;
    productCount: number;
    avgReturnRate: number;
}

interface WorstProductInput {
    name: string;
    netProfit: number;
    margin: number;
    returnRate: number;
    salesPrice: number;
}

interface CampaignInput {
    campaignName: string;
    sellerShare: number;
    marketplaceShare: number;
    campaignOrders: number;
    campaignProfit: number;
    profitDelta: number;
}

interface AdvisorPayload {
    categoryRollups: CategoryInput[];
    worstProducts: WorstProductInput[];
    campaignImpacts: CampaignInput[];
    kpis: {
        totalOrderRevenue: number;
        totalOrderProfit: number;
        avgMargin: number;
        campaignOrderRatio: number;
    };
    marketplace: string;
}

/* ------------------------------------------------------------------ */
/*  Prompt Builder                                                     */
/* ------------------------------------------------------------------ */

function buildPrompt(p: AdvisorPayload): string {
    const categoryTable = p.categoryRollups
        .map(
            (c) =>
                `| ${c.category} | ${c.revenue.toLocaleString("tr-TR")} TL | ${c.profit.toLocaleString("tr-TR")} TL | %${c.margin} | ${c.productCount} | %${c.avgReturnRate} |`
        )
        .join("\n");

    const worstList = p.worstProducts
        .map(
            (w) =>
                `- **${w.name}**: Zarar ${w.netProfit.toLocaleString("tr-TR")} TL, Marj %${w.margin}, İade %${w.returnRate}, Fiyat ${w.salesPrice.toLocaleString("tr-TR")} TL`
        )
        .join("\n");

    const campaignList =
        p.campaignImpacts.length > 0
            ? p.campaignImpacts
                .map(
                    (c) =>
                        `- **${c.campaignName}**: ${c.campaignOrders} sipariş, Kâr ${c.campaignProfit.toLocaleString("tr-TR")} TL, Seller Pay %${Math.round(c.sellerShare * 100)}, Sipariş Başı Delta ${c.profitDelta >= 0 ? "+" : ""}${c.profitDelta.toLocaleString("tr-TR")} TL`
                )
                .join("\n")
            : "Aktif kampanya verisi yok.";

    return `Sen bir e-ticaret fiyatlandırma stratejisti ve kârlılık analistisin. Türk pazaryeri (${p.marketplace}) dinamiklerini iyi biliyorsun.

Aşağıdaki portföy verilerini analiz et ve spesifik stratejik tavsiyeler ver.

## Genel KPI'lar
- Toplam Ciro: ${p.kpis.totalOrderRevenue.toLocaleString("tr-TR")} TL
- Toplam Kâr: ${p.kpis.totalOrderProfit.toLocaleString("tr-TR")} TL
- Ortalama Marj: %${p.kpis.avgMargin}
- Kampanyalı Sipariş Oranı: %${p.kpis.campaignOrderRatio}

## Kategori Performansı
| Kategori | Ciro | Kâr | Marj | SKU | İade% |
| :--- | :--- | :--- | :--- | :--- | :--- |
${categoryTable}

## En Zararlı Ürünler
${worstList || "Zararda ürün yok."}

## Kampanya Etkileri
${campaignList}

## Görevlerin
Aşağıdaki formatta Türkçe analiz yap. Her kategori için ayrı başlık kullan:

### 🔴 KRİTİK UYARILAR
Acil müdahale gerektiren durumları listele (yüksek iade, negatif marj kategoriler).

### 📊 KATEGORİ STRATEJİLERİ
Her kategori için spesifik öneriler ver:
- Fiyat ayarlaması gerekiyor mu?
- İade oranı yüksekse ne yapılmalı?
- Hangi kategoriler büyütülmeli, hangilerine daraltılmalı?

### 🏷️ ÜRÜN BAZLI AKSİYONLAR
Zarardaki her ürün için somut adım öner:
- Fiyat artırılmalı mı? Ne kadar?
- Ürün portföyden çıkarılmalı mı?
- Maliyet optimizasyonu yapılabilir mi?

### 🎯 KAMPANYA STRATEJİSİ
- Kampanya katılımı kârlı mı?
- Seller share oranı optimize edilebilir mi?
- Hangi kampanyalara katılmalı, hangilerinden çıkılmalı?

### 💡 GENEL ÖNERİLER
3-5 maddelik kısa ve orta vadeli strateji önerileri.

Kısa, net ve aksiyon odaklı yaz. Her öneri için beklenen etkiyi belirt.`;
}

/* ------------------------------------------------------------------ */
/*  Fallback Analysis                                                  */
/* ------------------------------------------------------------------ */

function generateFallbackAnalysis(p: AdvisorPayload): string {
    const highReturnCats = p.categoryRollups.filter((c) => c.avgReturnRate > 5);
    const negativeCats = p.categoryRollups.filter((c) => c.profit < 0);
    const avgMargin = p.kpis.avgMargin;

    let criticalWarnings = "";
    if (negativeCats.length > 0) {
        criticalWarnings += negativeCats
            .map(
                (c) =>
                    `- **${c.category}** kategorisi zararda (${c.profit.toLocaleString("tr-TR")} TL). Fiyat revizyonu veya portföy daraltması gerekli.`
            )
            .join("\n");
    }
    if (highReturnCats.length > 0) {
        criticalWarnings += "\n" + highReturnCats
            .map(
                (c) =>
                    `- **${c.category}** kategorisinde iade oranı yüksek (%${c.avgReturnRate}). Ürün kalitesi ve açıklama doğruluğu kontrol edilmeli.`
            )
            .join("\n");
    }
    if (!criticalWarnings) {
        criticalWarnings = "- Acil müdahale gerektiren kritik durum tespit edilemedi.";
    }

    const worstActions = p.worstProducts.length > 0
        ? p.worstProducts
            .map((w) => {
                if (w.margin < -10) return `- **${w.name}**: Portföyden çıkarılması veya %15+ fiyat artışı önerilir.`;
                if (w.margin < 0) return `- **${w.name}**: Fiyat %5-10 artırılmalı. Maliyet optimizasyonu araştırılmalı.`;
                return `- **${w.name}**: Marj düşük (%${w.margin}). Kargo/komisyon optimizasyonu yapılmalı.`;
            })
            .join("\n")
        : "- Zararda ürün bulunmuyor — tebrikler!";

    const campaignNote =
        p.campaignImpacts.length > 0
            ? p.campaignImpacts
                .map((c) =>
                    c.profitDelta >= 0
                        ? `- **${c.campaignName}**: Kârlı (sipariş başı +${c.profitDelta} TL). Katılıma devam.`
                        : `- **${c.campaignName}**: Zararlı (sipariş başı ${c.profitDelta} TL). Seller share pazarlığı veya çıkış önerilir.`
                )
                .join("\n")
            : "- Kampanya verisi mevcut değil.";

    return `### 🔴 KRİTİK UYARILAR
${criticalWarnings}

### 📊 KATEGORİ STRATEJİLERİ
${p.categoryRollups
            .slice(0, 5)
            .map(
                (c) =>
                    `- **${c.category}**: Marj %${c.margin}, ${c.margin < 5 ? "fiyat artışı gerekli" : c.margin > 20 ? "büyütme potansiyeli var" : "mevcut strateji korunabilir"}. İade %${c.avgReturnRate}${c.avgReturnRate > 5 ? " — ürün açıklamaları iyileştirilmeli" : ""}.`
            )
            .join("\n")}

### 🏷️ ÜRÜN BAZLI AKSİYONLAR
${worstActions}

### 🎯 KAMPANYA STRATEJİSİ
${campaignNote}

### 💡 GENEL ÖNERİLER
1. ${avgMargin < 10 ? "Genel marj düşük — maliyet optimizasyonu (kargo, komisyon pazarlığı) öncelikli." : "Marj sağlıklı — büyüme odaklı strateji uygulanabilir."}
2. Yüksek iade oranına sahip ürünlerde ürün fotoğrafı ve açıklama kalitesi artırılmalı.
3. Rakip fiyat takibi yapılarak rekabetçi pozisyon korunmalı.
4. Düşük marjlı kategorilerde hacim yerine kârlılık odaklı çalışılmalı.

_(Bu analiz kural tabanlı otomatik sistemle üretildi. Gemini API yapılandırıldığında AI destekli detaylı analiz aktif olacaktır.)_`;
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const geminiKey = Deno.env.get("GEMINI_API_KEY");

        if (!geminiKey) {
            const payload: AdvisorPayload = await req.json();
            return new Response(
                JSON.stringify({
                    error: "GEMINI_API_KEY yapılandırılmamış",
                    fallback: true,
                    analysis: generateFallbackAnalysis(payload),
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const payload: AdvisorPayload = await req.json();

        if (!payload.categoryRollups || !payload.kpis) {
            return new Response(
                JSON.stringify({
                    error: "Eksik parametreler: categoryRollups ve kpis gerekli",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const prompt = buildPrompt(payload);

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                        topP: 0.9,
                    },
                }),
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("Gemini API error:", errText);
            return new Response(
                JSON.stringify({
                    error: "Gemini API hatası",
                    fallback: true,
                    analysis: generateFallbackAnalysis(payload),
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const geminiData = await geminiRes.json();
        const text =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

        if (!text) {
            return new Response(
                JSON.stringify({
                    error: "Gemini boş yanıt verdi",
                    fallback: true,
                    analysis: generateFallbackAnalysis(payload),
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({ analysis: text, fallback: false }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : "Bilinmeyen hata",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
