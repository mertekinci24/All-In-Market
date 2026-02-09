import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CurrencyRates {
  USD: number;
  EUR: number;
  GBP: number;
  CNY: number;
  timestamp: string;
  source: string;
}

let cachedRates: CurrencyRates | null = null;
let cacheExpiry = 0;

const CACHE_TTL_MS = 15 * 60 * 1000;

async function fetchFromTCMB(): Promise<CurrencyRates | null> {
  try {
    const res = await fetch(
      "https://www.tcmb.gov.tr/kurlar/today.xml",
      { headers: { "User-Agent": "AllInMarket/1.0" } }
    );
    if (!res.ok) return null;

    const xml = await res.text();

    const parseRate = (code: string): number => {
      const regex = new RegExp(
        `<Currency[^>]*Kod="${code}"[^>]*>[\\s\\S]*?<ForexSelling>([\\d.,]+)<\\/ForexSelling>`,
        "i"
      );
      const match = xml.match(regex);
      if (!match) return 0;
      return parseFloat(match[1].replace(",", ".")) || 0;
    };

    const usd = parseRate("USD");
    const eur = parseRate("EUR");
    const gbp = parseRate("GBP");
    const cny = parseRate("CNY");

    if (usd === 0 && eur === 0) return null;

    return {
      USD: usd,
      EUR: eur,
      GBP: gbp,
      CNY: cny,
      timestamp: new Date().toISOString(),
      source: "TCMB",
    };
  } catch {
    return null;
  }
}

async function fetchFromFallback(): Promise<CurrencyRates | null> {
  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/TRY"
    );
    if (!res.ok) return null;

    const data = await res.json();
    const rates = data.rates;
    if (!rates) return null;

    return {
      USD: rates.USD ? 1 / rates.USD : 0,
      EUR: rates.EUR ? 1 / rates.EUR : 0,
      GBP: rates.GBP ? 1 / rates.GBP : 0,
      CNY: rates.CNY ? 1 / rates.CNY : 0,
      timestamp: new Date().toISOString(),
      source: "ExchangeRate-API",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (cachedRates && Date.now() < cacheExpiry) {
      return new Response(JSON.stringify(cachedRates), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rates = await fetchFromTCMB();
    if (!rates) {
      rates = await fetchFromFallback();
    }

    if (!rates) {
      return new Response(
        JSON.stringify({ error: "Kur verisi alinamadi" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    cachedRates = rates;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    return new Response(JSON.stringify(rates), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
