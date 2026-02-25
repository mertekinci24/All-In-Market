# 📋 Sky-Market — Master Task Registry & Changelog
> **Version:** V1.5.0-planning | **Architect Review:** 2026-02-25 | **Status Branch:** `main`
> **Role Standard:** Principal Architect Audit — Enterprise Transition Plan

---

## ✅ COMPLETED — V1.x Milestones (Verified in Codebase)

### [V1.4.1] "Armor" Release — PRODUCTION STABLE
> All items below are **confirmed** in the source code as of 2026-02-25.

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | **Dumb Collector Architecture** — Parser sends raw candidates, Backend decides winner | `trendyol-parser.js` | ✅ Done |
| 2 | **ProductSchema Validator** — `required: ['productName', 'currentPrice', 'url']` with rule guards | `trendyol-parser.js:61-96` | ✅ Done |
| 3 | **7-Strategy DNA Extraction** — PuzzleJs, JSON-LD, `__NEXT_DATA__`, Legacy, Window fallback | `trendyol-parser.js:533-656` | ✅ Done |
| 4 | **Nuclear Price Fallback** — Bracket-counting JSON extractor + `>20 TL` minimum threshold | `trendyol-parser.js:785-840` | ✅ Done |
| 5 | **Server-Side Price Processor** — `processRawPriceData()` → lowest-price logic | `analyze-product/index.ts:199-217` | ✅ Done |
| 6 | **OpportunityScoreEngine** — S-Curve normalization, 4-category weighting (30/30/25/15) | `analyze-product/index.ts:39-185` | ✅ Done |
| 7 | **AI Insight (Gemini 2.0 Flash)** — With `gemini-1.5-flash` fallback + 429 handler | `analyze-product/index.ts:271-320` | ✅ Done |
| 8 | **Auto-Product Tracking** — Creates product record if `productId` missing + URL dedup | `analyze-product/index.ts:331-376` | ✅ Done |
| 9 | **`product_mining` Upsert** — Dashboard "Ürün Madenciliği" table is populated | `analyze-product/index.ts:414-446` | ✅ Done |
| 10 | **ErrorHandler.js** — Fire-and-forget logger to Supabase via `chrome.runtime.sendMessage` | `extension/lib/error-handler.js` | ✅ Done |
| 11 | **ERROR_MAP (12 patterns)** — Turkish user messages for all major HTTP errors | `error-handler.js:8-20` | ✅ Done |
| 12 | **`productId` extraction** — PuzzleJS / LD-JSON / URL fallback (`-p-XXXXX`) | `trendyol-parser.js:688-700` | ✅ Done |
| 13 | **`apikey` header fix** — All 5 Edge Function `fetch` calls corrected | `background.js` (rc4) | ✅ Done |
| 14 | **Edge Function Boot Fix** — `scoreReviews` duplicate declaration removed | `analyze-product/index.ts` (rc3) | ✅ Done |
| 15 | **SDK Update** — `@google/generative-ai` v0.1.3 → v0.21.0 | `analyze-product/index.ts:3` | ✅ Done |
| 16 | **Schema Gate** — `_schemaValid === false` blocks `ANALYZE_PRODUCT` call | `overlay.js` (rc2) | ✅ Done |
| 17 | **Social Proof Parsing** — Cart/View/Fav regex + DOM fallback | `trendyol-parser.js:216-264` | ✅ Done |
| 18 | **Velocity Score** — Titanium velocity algo: `(views/100) * (1 + carts/views)` | `analyze-product/index.ts:99-110` | ✅ Done |
| 19 | **AI Review Analysis** — `analyze-reviews` Edge Function + `ReviewSummarizer.tsx` | `supabase/functions/analyze-reviews/` | ✅ Done |
| 20 | **Deep Review Crawl** — 4-strategy fetcher (`commentBody`, full state, nuclear regex) | `trendyol-parser.js:363-530` | ✅ Done |

---

## 🔄 IN PROGRESS — V1.4.x Carry-Overs

| # | Task | Priority | Blocker |
|---|------|----------|---------|
| 1 | **`technical_logs` RLS Policy** — 403 Forbidden confirmed in gateway logs (rc3). Write-access RLS missing for anonymous inserters | 🔴 Critical | Supabase Dashboard → Policies |
| 2 | **`trendyol-parser.ts` ↔ `.js` Sync** — TypeScript source (`trendyol-parser.ts`: 15KB) is NOT in sync with compiled `.js` (50KB). Build pipeline broken or manual | 🔴 Critical | Vite build config |
| 3 | **Stock Health Parsing** — `parseStock()` returns `"Mevcut (Veri Yok) ⚪"` on JSON fail. Partial implementation | 🟡 Medium | Trendyol DOM selector audit |
| 4 | **`serp-parser.js` Integration** — File exists (6.5KB) but not referenced in the score engine or dashboard flow | 🟡 Medium | Integration planning |
| 5 | **`gateway-config` Edge Function** — Returns 401 in last known test. May have stale auth | 🟡 Medium | Key rotation check |

---

## 🔧 TECHNICAL DEBT — Must Fix Before V1.5.0

### 🔴 Security (P0 — Blocking Enterprise)

| ID | Debt | Location | Fix |
|----|------|----------|-----|
| TD-01 | **CORS `Access-Control-Allow-Origin: *`** — Wildcard CORS on all Edge Functions. Production risk | `analyze-product/index.ts:6` | Replace `*` with `https://your-dashboard.vercel.app` |
| TD-02 | **SUPABASE_ANON_KEY in Edge Function DB Client** — Should use SERVICE_ROLE for server-side ops, not anon key | `analyze-product/index.ts:325` | Use `SUPABASE_SERVICE_ROLE_KEY` env var |
| TD-03 | **`config.js` in Extension** — API keys stored in plain JS file. If extension is extracted, keys leak | `extension/config.js` | Move to `chrome.storage.sync` + secure provisioning |
| TD-04 | **Auto Buy-Price Assumption** — `buy_price: salesPrice * 0.5` is a hardcoded 50% guess with no basis | `analyze-product/index.ts:361` | Remove auto-calculation or make it explicit in UI |

### 🟡 Architecture (P1 — Scalability)

| ID | Debt | Location | Fix |
|----|------|----------|-----|
| TD-05 | **OpportunityScoreEngine Duplication** — Same class exists in both extension and Edge Function. Single source of truth needed | `analyze-product/index.ts:10` | Extract to `supabase/functions/_shared/score-engine.ts` |
| TD-06 | **Social Proof Not in Score Engine Payload** — Parser collects it but `background.js` may not forward `socialProof` object | `background.js` | Audit ANALYZE_PRODUCT message payload |
| TD-07 | **No Input Validation on Edge Function** — Only `metrics` is checked for null. `storeId`, `productMetadata` fields can be malformed | `analyze-product/index.ts:249` | Add `zod` or manual schema validation |
| TD-08 | **`fetchDeepReviews()` Nuclear Regex** — 10,000 iteration limit on raw HTML. Memory/CPU intensive on large pages | `trendyol-parser.js:501` | Cap to 5,000 or move to Web Worker |
| TD-09 | **`findKeyRecursive()` — No Cycle Protection** — Circular reference in scraped JSON would cause infinite loop | `trendyol-parser.js:102` | Add `visited: Set` guard |
| TD-10 | **`background.ts` vs `background.js`** — Two versions of background script. Which is deployed? | `extension/` | Consolidate to TypeScript, delete `.js` manually compiled copy |

### 🟢 Performance (P2)

| ID | Debt | Location | Fix |
|----|------|----------|-----|
| TD-11 | **No Debounce on Parser Init** — Parser runs on every URL change (SPA navigation). May fire multiple times | `trendyol-parser.js:7` | Add `isInitialized` flag or `MutationObserver` guard |
| TD-12 | **`document.body.innerText` Called 3x** — Social proof, variants, price all read full body text separately | `trendyol-parser.js` | Read once, store in `const pageText` |
| TD-13 | **No Caching for `getInitialState()`** — Called once per page but iterates all `<script>` tags (can be 50+) | `trendyol-parser.js:533` | Cache result in module-level variable |

---

## 🚀 V1.5.0 "SaaS-Stable" — Sprint Plan

> **Target:** Stable, multi-tenant, enterprise-ready SaaS with secure auth and clean architecture.
> **Estimated Duration:** 3 weeks (2 engineers)

### Sprint 1 — Security Hardening (Week 1)
- [ ] **TD-01** Fix CORS wildcard across all 9 Edge Functions
- [ ] **TD-02** Switch Edge Function DB client to SERVICE_ROLE key
- [ ] **TD-03** Migrate extension API keys to `chrome.storage.sync`
- [ ] **TD-04** Remove hardcoded `buy_price * 0.5` assumption
- [ ] Fix `technical_logs` RLS policy (IN PROGRESS item #1)
- [ ] Rotate Supabase anon key (was exposed in git history)

### Sprint 2 — Architecture Cleanup (Week 2)
- [ ] **TD-05** Extract `OpportunityScoreEngine` to shared module
- [ ] **TD-06** Audit and fix `socialProof` payload in `background.js`
- [ ] **TD-07** Add Zod validation to all Edge Functions
- [ ] **TD-09** Fix `findKeyRecursive` cycle protection
- [ ] **TD-10** Consolidate `background.ts` → single TypeScript build
- [ ] Fix `trendyol-parser.ts ↔ .js` sync (IN PROGRESS item #2)
- [ ] Set up Vite build pipeline for extension TypeScript

### Sprint 3 — Performance & Dashboard (Week 3)
- [ ] **TD-11** Add parser debounce / SPA navigation guard
- [ ] **TD-12** Consolidate `document.body.innerText` reads
- [ ] **TD-13** Cache `getInitialState()` result
- [ ] **TD-08** Cap Nuclear Regex to 5,000 iterations
- [ ] Integrate `serp-parser.js` into dashboard flow (IN PROGRESS item #4)
- [ ] Add automated E2E test for parser → backend → dashboard flow

---

## 🌍 ARCHITECTURE ROADMAP — Multi-Platform Support (V2.0)

> **Goal:** Sky-Market becomes a universal e-commerce intelligence tool, not Trendyol-only.

### Phase 1 — Abstraction Layer (V1.6.0)
Decouple platform-specific code from core infrastructure:

```
extension/
  adapters/
    trendyol/     ← Move trendyol-parser.js here
      parser.js
      selectors.js
    amazon/       ← New
      parser.js
      selectors.js
    n11/          ← New
    hepsiburada/  ← New
  core/
    base-parser.js      ← Abstract Parser class
    product-schema.js   ← Shared ProductSchema Contract
    error-handler.js
```

**Key Principle:** Every platform adapter must output the **same ProductSchema**.
The `base-parser.js` enforces this contract with `validateProductData()`.

### Phase 2 — Platform Registry (V1.7.0)
```js
// manifest.json — add new platform in ONE place
"content_scripts": [
  { "matches": ["*://*.trendyol.com/*-p-*"], "js": ["adapters/trendyol/parser.js"] },
  { "matches": ["*://*.amazon.com.tr/dp/*"],  "js": ["adapters/amazon/parser.js"] },
  { "matches": ["*://*.n11.com/urun/*"],       "js": ["adapters/n11/parser.js"] }
]
```

### Phase 3 — Backend Marketplace Abstraction (V1.8.0)
```
supabase/functions/
  analyze-product/
    index.ts          ← Platform-agnostic (already is, mostly)
  _shared/
    score-engine.ts   ← Shared OpportunityScoreEngine (TD-05 fix)
    price-logic.ts    ← Shared processRawPriceData
    platform-config.ts ← Commission rates per platform
```

### Platform Priority Matrix
| Platform | Market Size (TR) | Complexity | Target Version |
|----------|-----------------|------------|----------------|
| Trendyol | 🔴 Current | Done | V1.x |
| Amazon TR | 🔴 Very High | Medium (JSON-LD available) | V1.6.0 |
| Hepsiburada | 🟡 High | Medium | V1.7.0 |
| N11 | 🟢 Medium | Low | V1.7.0 |
| Çiçeksepeti | 🟢 Medium | Low | V1.8.0 |
| Etsy TR | 🟢 Low | High (anti-scrape) | V2.0.0 |

---

## 📜 CHANGELOG

### [1.4.1-rc7] — 2026-02-18
- `background.js` — Fixed Invalid JWT: enforced global config for all API calls
- `background.js` — Auto-logout on 401/403 responses
- `trendyol-parser.js` — `productId` extraction (PuzzleJS/LD-JSON/URL fallback)

### [1.4.1-rc6] — 2026-02-18
- Root cause: `productId` was not returned by parser, causing undefined payload to Edge Function
- Fixed parser output object to include `productId` field

### [1.4.1-rc5] — 2026-02-18
- `@google/generative-ai` v0.1.3 → v0.21.0 (Gemini 2.0 model support)
- `safeMetadata` wrapper: prevents `.split()` crash on undefined `url`

### [1.4.1-rc4] — 2026-02-18
- All 5 Edge Function fetch calls in `background.js` received missing `apikey` header
- Root cause: Supabase rejects requests without `apikey` header at gateway level

### [1.4.1-rc3] — 2026-02-18
- **[BLOCKER FIX]** `analyze-product/index.ts`: removed duplicate `const scoreReviews` (SyntaxError → 503 BootFailure)
- `config.js`: anon key updated from `sb_publishable_` format to JWT (`eyJ...`) format
- 503 → 500 transition confirmed in gateway logs (boot fix verified)

### [1.4.1-rc2] — 2026-02-18
- `overlay.js`: ERROR_MAP with Turkish messages, schema gate for invalid products
- `background.js`: null guard for `currentPrice <= 0`
- **Lesson:** Cosmetic error messages ≠ fixing root cause

### [1.4.1-rc1] — 2026-02-18
- `getInitialState()`: PuzzleJs `__PRODUCT_DETAIL__DATALAYER` extraction (Strategy 6)
- `getInitialState()`: JSON-LD `<script type="application/ld+json">` extraction (Strategy 7)
- Nuclear Price: minimum threshold `>20 TL`, regex `\d{2,6}[.,]\d{2} TL`
- Confirmed: Price ✅ | Product Name ✅ | FIRSAT PUANI ❌ (fixed in rc3-rc4)

### [1.1.5] — 2026-02-17
- Aggressive Regex text matching for Price and Reviews when standard selectors fail
- Restored `.prc-box-sll` (Basket Price) extraction priority
- Documented JSON parsing limitation; relying on advanced DOM scraping

---

*Last updated: 2026-02-25 by Principal Architect Audit*
