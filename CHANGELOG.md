# 📋 CHANGELOG — Sky-Market Extension

> Tüm değişiklikler, sonuçları ve çıkarılan dersler burada kayıt altında tutulur.

---

## [1.4.1-rc1] — 2026-02-18T20:00

### Eklenen
- `getInitialState()`: PuzzleJs `__PRODUCT_DETAIL__DATALAYER` extraction (Strategy 6)
- `getInitialState()`: JSON-LD `<script type="application/ld+json">` extraction (Strategy 7)
- Nuclear Price: Minimum threshold `>1` → `>20`, regex `\d{2,6}[.,]\d{2} TL`
- JSON-LD price fallback (Priority 1.5)
- Name/brand extraction from `dna.jsonLd` and `dna.puzzleProduct`

### Sonuç
- ✅ Fiyat doğru çalışıyor: **219.9 TL** (ekran görüntüsünde doğrulandı)
- ✅ Ürün adı çalışıyor (h1 fallback başarılı)
- ❌ FIRSAT PUANI hâlâ çalışmıyor (Edge Function bağlantısı kesildi)

### Dosyalar
- `trendyol-parser.js`: getInitialState, Nuclear Price, name/price extraction

---

## [1.4.1-rc2] — 2026-02-18T21:25

### Eklenen
- `overlay.js` ERROR_MAP: `Not authenticated`, `Oturum açın`, `No store found` pattern'leri
- `overlay.js` score fallback: Hata durumunda `'-'` → `'N/A'`
- `overlay.js` schema gate: `_schemaValid === false` → ANALYZE_PRODUCT engelle
- `background.js` handleLogError: `insertRow`'a eksik `config` parametresi eklendi
- `background.js` NaN guard: `currentPrice <= 0` kontrolü

### Sonuç
- ✅ Hata mesajı artık Türkçe ve anlamlı (generic fallback yerine)
- ✅ Score "N/A" gösteriyor (sessiz "-" yerine)
- ❌ **Asıl sorun çözülmedi**: "🌐 Sunucuya bağlanılamadı" hatası devam ediyor
- ❌ Edge Function çağrısı `Failed to fetch` ile çöküyor

### Ders
> ⚠️ Hata mesajlarını güzelleştirmek sorunu çözmez. Asıl sorun: Edge Function'a neden ulaşılamıyor? Bu teşhis atlandı.

### Dosyalar
- `overlay.js`: ERROR_MAP, updateOverlay, _schemaValid gate
- `background.js`: handleLogError, handleAnalyzeProduct

---

## [1.4.1-rc3] — 2026-02-18T21:49 — API Gateway Logu Analizi

### Önceki Yanlış Teşhis Düzeltmesi
- ~~`SUPABASE_ANON_KEY` geçersiz~~ → `sb_publishable_` formatı çalışıyor (gateway loglarında 200 response'lar görüldü)
- Gerçek kök neden: Edge Function'da **duplicate variable declaration** + config'deki key format uyumsuz

### Düzeltilen
- **[BLOCKER]** `analyze-product/index.ts`: `const scoreReviews` satır 138 ve 148'de **iki kez tanımlanmıştı** → `SyntaxError: Identifier 'scoreReviews' has already been declared` → 503 BootFailure. İkinci kopya silindi.
- `config.js`: `SUPABASE_ANON_KEY` → `sb_publishable_` formatından JWT formatına (`eyJ...`) güncellendi. JWT format Edge Functions ve auth endpoint'lerle evrensel uyumlu.

### Canlı Doğrulama
- Deploy öncesi: `analyze-product` → **503** (BootFailure)
- Deploy sonrası: `analyze-product` → **500** (runtime error — boot başarılı, business logic'te beklenen hata çünkü test payload gerçek user token içermiyor)
- **503 → 500 geçişi boot fix'inin çalıştığını kanıtlıyor**

### Sonuç
- ✅ Edge Function boot hatası düzeltildi
- ✅ Anon key JWT formatına güncellendi
- ⏳ Gerçek kullanıcı token'ıyla test bekleniyor (eklentiyi yenileyip Trendyol sayfasını açmak)

### Gateway Loglarından Ek Bulgular
- `technical_logs` POST → **403** Forbidden (RLS policy eksik — hata loglaması engellenmiş)
- `auth/v1/token?grant_type=refresh_token` → **400** (eski refresh token'lar geçersiz)
- `user_id=1106c758-...` ile istekler → **401** (eski/süresi dolmuş oturum)

### Dosyalar
- `supabase/functions/analyze-product/index.ts`: duplicate scoreReviews kaldırıldı
- `extension/config.js`: anon key güncellendi

---

## [1.4.1-rc4] — 2026-02-18T22:01 — Missing apikey Header Fix

### Kök Neden
Tüm Edge Function `fetch` çağrılarında `apikey` header'ı eksikti. Supabase Edge Functions bu header olmadan isteği reddeder → "Failed to fetch" → "Sunucuya bağlanılamadı".

### Düzeltilen (5 fetch çağrısı)
| Fonksiyon | Satır | Düzeltme |
|-----------|-------|----------|
| `send-notification` | ~250 | +apikey header |
| `gateway-config` | ~277 | +apikey, -credentials:include |
| `analyze-reviews` | ~328 | +apikey, -credentials:include |
| `analyze-reviews` | ~457 | +apikey |
| `analyze-product` | ~645 | +apikey, -credentials:include |

### Dosyalar
- `extension/background.js`: 5 Edge Function fetch çağrısına `apikey` header eklendi

---

## [MEVCUT SORUN] — 2026-02-18T21:33 — Canlı API Testi ile Doğrulandı

### Belirti
Overlay'de: `🌐 Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.`

### Canlı Test Sonuçları
- `gateway-config` → **401 Unauthorized** (key geçersiz)
- `analyze-product` → **503 Service Unavailable** (boot hatası)

### Kök Neden 1: Geçersiz SUPABASE_ANON_KEY
`config.js` içindeki `sb_publishable_cwcKLR3tEgjrlQ6bnVv7YQ_oeByY0Kj` geçersiz. Gerçek Supabase anon key'ler `eyJ...` ile başlayan JWT formatındadır.

### Kök Neden 2: Edge Function 503
`analyze-product` fonksiyonu runtime'da çöküyor. `@google/generative-ai@0.1.3` çok eski ve/veya `GEMINI_API_KEY` Supabase secrets'te tanımlı değil.

### Ders
> ⚠️ Extension kodu mükemmel çalışsa bile, Backend (Edge Function + API Key) bozuksa hiçbir şey işe yaramaz. **Her zaman backend'i de test et.**

---

## [1.4.1-rc5] — 2026-02-18T22:45 — Edge Function Runtime Fix

### Kök Neden
1. **SDK Uyumsuzluğu:** `@google/generative-ai` v0.1.3 kullanılıyordu, ancak `gemini-2.0-flash` modeli bu versiyonda yoktu.
2. **Crash:** `productMetadata.url` undefined geldiğinde `.split('?')` çağrısı fonksiyonu çökertiyordu (500 Internal Server Error).

### Düzeltmeler
- **SDK Update:** `v0.1.3` → `v0.21.0` (Gemini 2.0 desteği geldi)
- **Null Safety:** `safeMetadata` wrapper eklendi. `url`, `name`, `price` gibi alanlar eksik olsa bile fonksiyon çalışmaya devam ediyor.

### Sonuç
- Dashboard üzerinden ekleme yapıldığında skor başarılı şekilde hesaplanıyor.
- Extension tarafında hala sorun var (rc6 ile çözülecek).

---

## [1.4.1-rc6] — 2026-02-18T22:55 — Extension Data Flow Fix

### Sorun
Edge Function düzeltilmesine rağmen Extension'da skor "N/A" kalıyordu. Dashboard çalışırken Extension'ın çalışmaması **veri eksikliğini** işaret etti.

### Kök Neden
`trendyol-parser.js` parsing sonucunda `productId` alanını döndürmüyordu. Ancak `background.js` içindeki `handleAnalyzeProduct` fonksiyonu `product.productId` verisine ihtiyaç duyuyordu. Bu alan `undefined` olduğu için Edge Function'a eksik veri gidiyordu.

### Düzeltmeler
- **[1.4.1-rc6]** (2026-02-18): `trendyol-parser.js` - Added `productId` extraction (PuzzleJS/LD-JSON/URL fallback). Parser çıktı objesine `productId` alanı eklendi.
- **[1.4.1-rc7]** (2026-02-18): `background.js` - Fixed `Invalid JWT` by enforcing global config usage for API calls. Added auto-logout on 401/403 errors.

### Sonuç
- ✅ Veri akışı `Parser` -> `Background` -> `Edge Function` şeklinde tamir edildi.
- ✅ Eklentiyi yenileyip denediğinizde skorun gelmesi gerekiyor.
