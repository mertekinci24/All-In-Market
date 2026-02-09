import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProductPayload {
  name: string;
  currentPrice: number;
  targetPrice: number;
  buyPrice: number;
  commissionRate: number;
  vatRate: number;
  shippingCost: number;
  competitorPrice: number | null;
  category: string;
  currentMargin: number;
  currentRoi: number;
  currentNetProfit: number;
  simulatedMargin: number;
  simulatedRoi: number;
  simulatedNetProfit: number;
  profitDelta: number;
}

function buildPrompt(p: ProductPayload): string {
  const competitorLine = p.competitorPrice
    ? `Rakip Fiyatı: ${p.competitorPrice} TL`
    : "Rakip Fiyatı: Bilinmiyor";

  return `Sen bir e-ticaret fiyatlandırma stratejisti ve karlılık analistisin. Türk pazaryeri (Trendyol, Hepsiburada) dinamiklerini iyi biliyorsun.

Aşağıdaki ürün için fiyat değişikliği simülasyonu yapıldı. Analiz et ve strateji öner.

## Ürün Bilgileri
- Ürün: ${p.name}
- Kategori: ${p.category}
- Alış Maliyeti: ${p.buyPrice} TL
- Mevcut Satış Fiyatı: ${p.currentPrice} TL
- Hedef Satış Fiyatı: ${p.targetPrice} TL
- ${competitorLine}
- Komisyon Oranı: %${(p.commissionRate * 100).toFixed(1)}
- KDV: %${p.vatRate}
- Kargo Maliyeti: ${p.shippingCost} TL

## Mevcut Durum
- Net Kar: ${p.currentNetProfit} TL
- Kar Marjı: %${p.currentMargin}
- ROI: %${p.currentRoi}

## Simülasyon Sonucu (Hedef Fiyatla)
- Net Kar: ${p.simulatedNetProfit} TL
- Kar Marjı: %${p.simulatedMargin}
- ROI: %${p.simulatedRoi}
- Kar Değişimi: ${p.profitDelta >= 0 ? "+" : ""}${p.profitDelta} TL

## Görev
Aşağıdaki formatta Türkçe analiz yap:

**KARAR:** [MATCH / HOLD / ARTTIR] — Tek kelime karar ve kısa açıklama.

**ANALİZ:**
1. Bu fiyat değişikliğinin karlılık etkisini değerlendir.
2. Rakip fiyatı varsa rekabet durumunu analiz et.
3. Pazaryeri algoritması (listeleme sırası, buy-box) açısından etkisini belirt.

**RİSKLER:**
- Olası riskleri listele (marj erimesi, fiyat savaşı, stok riski vb.)

**STRATEJİ ÖNERİSİ:**
- Kısa vadeli (1-2 hafta) ve orta vadeli (1 ay) somut adımlar öner.
- Varsa alternatif fiyat noktası öner.

Kısa, net ve aksiyon odaklı yaz. Gereksiz tekrar yapma.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY yapilandirilmamis",
          fallback: true,
          analysis: generateFallbackAnalysis(await req.json()),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: ProductPayload = await req.json();

    if (!payload.name || !payload.currentPrice || !payload.targetPrice) {
      return new Response(
        JSON.stringify({ error: "Eksik parametreler: name, currentPrice, targetPrice gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            maxOutputTokens: 1024,
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
          error: "Gemini API hatasi",
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
          error: "Gemini bos yanit verdi",
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

function generateFallbackAnalysis(p: ProductPayload): string {
  const decision =
    p.profitDelta > 0
      ? "ARTTIR"
      : p.simulatedMargin >= 5
        ? "MATCH"
        : "HOLD";

  const decisionExplain =
    decision === "ARTTIR"
      ? "Fiyat artisi karliliga olumlu etki yapiyor."
      : decision === "MATCH"
        ? "Marj kabul edilebilir seviyede, rekabet icin fiyat eslenebilir."
        : "Marj kritik seviyenin altina dusuyor, mevcut fiyat korunmali.";

  const competitorNote = p.competitorPrice
    ? p.targetPrice <= p.competitorPrice
      ? `Hedef fiyat (${p.targetPrice} TL) rakibin altinda (${p.competitorPrice} TL). Buy-box avantaji saglanabilir.`
      : `Hedef fiyat (${p.targetPrice} TL) rakibin ustunde (${p.competitorPrice} TL). Listeleme sirasi dusebilir.`
    : "Rakip fiyat verisi mevcut degil.";

  const riskNote =
    p.simulatedMargin < 3
      ? "UYARI: Marj %3'un altinda. Ek maliyetlerde zarar riski yuksek."
      : p.simulatedMargin < 10
        ? "DIKKAT: Marj %10'un altinda. Dar marj operasyonel riskleri arttirir."
        : "Marj saglıklı seviyede.";

  return `**KARAR:** ${decision} -- ${decisionExplain}

**ANALIZ:**
1. Fiyat ${p.currentPrice} TL'den ${p.targetPrice} TL'ye degisiyor. Kar degisimi: ${p.profitDelta >= 0 ? "+" : ""}${p.profitDelta} TL.
2. ${competitorNote}
3. Simule edilen marj: %${p.simulatedMargin}, ROI: %${p.simulatedRoi}.

**RISKLER:**
- ${riskNote}
- Fiyat degisikligi sonrasi satis hacmi degisebilir (elastikiyet etkisi).
- Rakiplerin fiyat tepkisi belirsiz.

**STRATEJI ONERISI:**
- Kisa vade: Hedef fiyati ${decision === "HOLD" ? "uygulamayin, mevcut fiyati koruyun" : "uygulayin ve 3-5 gun satis hacmi degisimini izleyin"}.
- Orta vade: ${p.competitorPrice ? "Rakip fiyat hareketlerini gunluk takip edin." : "Rakip fiyat verisi ekleyerek rekabet analizi yapin."}
- ${p.simulatedMargin < 10 ? "Maliyet optimizasyonu (kargo, komisyon pazarligi) ile marji iyilestirin." : "Mevcut maliyet yapisini koruyun."}

_(Bu analiz kurallara dayali otomatik sistemle uretildi. Gemini API yapilandirildiginda AI destekli detayli analiz aktif olacaktir.)_`;
}
