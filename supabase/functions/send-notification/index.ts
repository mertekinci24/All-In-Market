import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelegramPayload {
  action: "test" | "alert";
  storeId: string;
  botToken?: string;
  chatId?: string;
  message?: string;
  alertType?: "price_drop" | "margin_warning" | "stock_change" | "competitor_change";
  productName?: string;
  details?: Record<string, string | number>;
}

function buildAlertMessage(payload: TelegramPayload): string {
  const { alertType, productName, details } = payload;

  const icons: Record<string, string> = {
    price_drop: "📉",
    margin_warning: "⚠️",
    stock_change: "📦",
    competitor_change: "🔍",
  };

  const titles: Record<string, string> = {
    price_drop: "Fiyat Düşüşü Uyarısı",
    margin_warning: "Marj Uyarısı",
    stock_change: "Stok Değişikliği",
    competitor_change: "Rakip Fiyat Değişikliği",
  };

  const icon = icons[alertType ?? "price_drop"] ?? "🔔";
  const title = titles[alertType ?? "price_drop"] ?? "Bildirim";

  let msg = `${icon} *${title}*\n\n`;
  msg += `*Ürün:* ${productName ?? "Bilinmeyen"}\n`;

  if (details) {
    for (const [key, value] of Object.entries(details)) {
      msg += `*${key}:* ${value}\n`;
    }
  }

  msg += `\n🕐 ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`;
  msg += `\n_All-In-Market Bildirim Sistemi_`;

  return msg;
}

async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    return { ok: false, error: data.description ?? "Telegram API hatasi" };
  }

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yetkilendirme gerekli" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Gecersiz oturum" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: TelegramPayload = await req.json();

    if (!payload.storeId) {
      return new Response(
        JSON.stringify({ error: "storeId gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, user_id")
      .eq("id", payload.storeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!store) {
      return new Response(
        JSON.stringify({ error: "Magaza bulunamadi veya yetkiniz yok" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.action === "test") {
      const botToken = payload.botToken;
      const chatId = payload.chatId;

      if (!botToken || !chatId) {
        return new Response(
          JSON.stringify({ error: "botToken ve chatId gerekli" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testMsg =
        "✅ *All-In-Market Telegram Bağlantısı Başarılı!*\n\n" +
        "Bildirimler bu sohbete gönderilecek.\n" +
        `🕐 ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`;

      const result = await sendTelegram(botToken, chatId, testMsg);

      if (!result.ok) {
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Test mesaji gonderildi" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.action === "alert") {
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("store_id", payload.storeId)
        .maybeSingle();

      if (!settings || !settings.telegram_enabled) {
        return new Response(
          JSON.stringify({ success: false, error: "Telegram bildirimleri aktif degil" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Telegram yapilandirmasi eksik" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shouldNotify =
        (payload.alertType === "price_drop" && settings.notify_price_drop) ||
        (payload.alertType === "margin_warning" && settings.notify_margin_warning) ||
        (payload.alertType === "stock_change" && settings.notify_stock_change) ||
        (payload.alertType === "competitor_change" && settings.notify_competitor_change);

      if (!shouldNotify) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Bu bildirim tipi devre disi" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const message = buildAlertMessage(payload);
      const result = await sendTelegram(settings.telegram_bot_token, settings.telegram_chat_id, message);

      return new Response(
        JSON.stringify({ success: result.ok, error: result.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Gecersiz action: 'test' veya 'alert' olmali" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
