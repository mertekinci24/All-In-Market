import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncPayload {
  store_id: string;
  products: Array<{
    external_id: string;
    name: string;
    sales_price: number;
    original_price?: number;
    competitor_price?: number;
    stock_status?: string;
    image_url?: string;
    category?: string;
    marketplace_url?: string;
    seller_name?: string;
    rating?: number;
    review_count?: number;
  }>;
}

function parsePrice(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/[^\d.,]/g, "")
      .replace(/\.(?=.*[.,])/g, "")
      .replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: SyncPayload = await req.json();

    if (!payload.store_id || !Array.isArray(payload.products)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: store_id and products array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", payload.store_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!store) {
      return new Response(
        JSON.stringify({ error: "Store not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of payload.products) {
      const salesPrice = parsePrice(item.sales_price);

      const { data: existing } = await supabase
        .from("products")
        .select("id, sales_price, buy_price, commission_rate, vat_rate, shipping_cost, extra_cost, ad_cost")
        .eq("store_id", payload.store_id)
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            name: item.name,
            sales_price: salesPrice,
            competitor_price: item.competitor_price ? parsePrice(item.competitor_price) : null,
            stock_status: item.stock_status ?? "InStock",
            image_url: item.image_url ?? null,
            category: item.category ?? null,
            marketplace_url: item.marketplace_url ?? null,
            last_scraped: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateErr) {
          errors.push(`Update failed for ${item.external_id}: ${updateErr.message}`);
        } else {
          updated++;

          const vatMultiplier = 1 + (existing.vat_rate ?? 20) / 100;
          const vat = salesPrice - salesPrice / vatMultiplier;
          const commission = salesPrice * (existing.commission_rate ?? 0.15);
          const totalCost =
            (existing.buy_price ?? 0) +
            vat +
            commission +
            (existing.shipping_cost ?? 0) +
            (existing.extra_cost ?? 0) +
            (existing.ad_cost ?? 0);
          const netProfit = salesPrice - totalCost;

          await supabase.from("price_snapshots").insert({
            product_id: existing.id,
            sales_price: salesPrice,
            competitor_price: item.competitor_price ? parsePrice(item.competitor_price) : null,
            buy_price: existing.buy_price ?? 0,
            net_profit: Math.round(netProfit * 100) / 100,
          });
        }
      } else {
        const { error: insertErr } = await supabase.from("products").insert({
          store_id: payload.store_id,
          external_id: item.external_id,
          name: item.name,
          sales_price: salesPrice,
          competitor_price: item.competitor_price ? parsePrice(item.competitor_price) : null,
          stock_status: item.stock_status ?? "InStock",
          image_url: item.image_url ?? null,
          category: item.category ?? null,
          marketplace_url: item.marketplace_url ?? null,
          last_scraped: new Date().toISOString(),
        });

        if (insertErr) {
          errors.push(`Insert failed for ${item.external_id}: ${insertErr.message}`);
        } else {
          created++;
        }
      }

      synced++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: payload.products.length, synced, created, updated, errors: errors.length },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
