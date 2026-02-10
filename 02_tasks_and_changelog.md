
# 📋 02_Tasks_and_Changelog.md

This is the **LIVING STATE** of the project.
**AI Instruction:** After completing a step, update this file immediately.

---

# 1. 🚦 Project Status Board
**Current Phase:** Phase 6 (Operasyonel Derinlik & Kampanya Yonetimi)
**Active Task:** Task 6.3 (Zaman Ayarli Komisyon Sistemi)
**Last Completed:** Task 6.1 & 6.2 (Siparisler Modulu — Database & Frontend)

---

# 2. 🗺️ Roadmap & Changelog

## Phase 1: Foundation (Hafta 1)
**Goal:** Initialize the project, set up the stack, and ensure security basics.
*(See previous logs for details)*

## Phase 2: Data & Engine (Hafta 2)
**Goal:** Build the Scraping Engine and Financial Calculator.
*(See previous logs for details)*

---

## Phase 3: Premium Dashboard (Hafta 3)
**Goal:** Visualizing the data with high-end UI components.

### [x] Task 3.1: Product Data Grid (Enhancement)
- **Objective:** Polish the Table UI with advanced filtering/sorting.
- **Changelog:**
  - **[2024-02-09]** Implemented Multi-column Sorting (Products, Price, Margin, ROI).
  - **[2024-02-09]** Created Advanced Filter Panel (Stock, Profitability, Category).
  - **[2024-02-09]** Added Smart Pagination (15 items/page) and Responsive Horizontal Scroll.
  - **[2024-02-09]** Added "Clear Filters" actions and tabular-nums alignment.

### [x] Task 3.2: Currency & External Data
- **Objective:** Fetch live exchange rates (USD/EUR).
- **Changelog:**
  - **[2024-02-09]** Deployed `currency-rates` Edge Function (TCMB Source + ExchangeRate-API Fallback).
  - **[2024-02-09]** Implemented Server-side Caching (15 min TTL).
  - **[2024-02-09]** Created `CurrencyTicker` component (Glassmorphism band with flags and live rates).

### [x] Task 3.3: Analytics & Charts (Advanced)
- **Objective:** Advanced Recharts integrations.
- **Changelog:**
  - **[2024-02-09]** Implemented "Category Performance" (Double Bar Chart: Revenue vs Profit).
  - **[2024-02-09]** Created "Margin vs ROI" Scatter Chart (Z-Axis = Revenue).
  - **[2024-02-09]** Added "Cost Breakdown" Donut Chart (VAT, Commission, Shipping analysis).
  - **[2024-02-09]** Applied unified Dark Glass Theme to all tooltips and legends.

---

## Phase 4: AI & Optimization (Hafta 4)
**Goal:** Integrating Gemini Pro for strategic advice.

### [x] Task 4.1: AI Scenario Module
- **Objective:** Connect Gemini API to analyze "Price Drop" simulations.
- **Changelog:**
  - **[2026-02-09]** Deployed `ai-scenario` Edge Function (Gemini 2.0 Flash + Rule-Based Fallback).
  - **[2026-02-09]** Implemented `useAiScenario` hook with JWT authentication.
  - **[2026-02-09]** Created `AiScenarioPage` with interactive simulation sliders and Markdown result renderer.
  - **[2026-02-09]** Added "Decision Engine" logic (MATCH/HOLD/INCREASE) based on profit delta.

### [x] Task 4.2: Notification System
- **Objective:** Telegram Bot / Browser Notification integration for critical updates.
- **Changelog:**

  #### Database Layer
  - **[2026-02-09]** Created `notification_settings` table with 14 columns (telegram credentials, browser toggle, 4 alert type toggles, 2 threshold values).
  - **[2026-02-09]** Applied UNIQUE constraint on `store_id` (one settings row per store) with ON DELETE CASCADE.
  - **[2026-02-09]** Enabled RLS with 4 restrictive policies (SELECT/INSERT/UPDATE/DELETE) — all checking `stores.user_id = auth.uid()`.

  #### Edge Function: `send-notification` [DEPLOYED]
  - **[2026-02-09]** Deployed `send-notification` Edge Function (~185 lines) supporting 2 actions: `test` and `alert`.
  - **[2026-02-09]** **Action: `test`** — Accepts user-provided `botToken` + `chatId`, sends a formatted test message to Telegram Bot API, returns success/error.
  - **[2026-02-09]** **Action: `alert`** — Reads `notification_settings` from DB, checks `telegram_enabled` + per-type toggle (`notify_price_drop`, `notify_margin_warning`, `notify_stock_change`, `notify_competitor_change`), builds Markdown message via `buildAlertMessage()`, sends via Telegram Bot API.
  - **[2026-02-09]** `buildAlertMessage()` formats 4 alert types with emojis, Turkish titles, product name, dynamic key-value details, Istanbul timezone timestamp, and "All-In-Market" signature.
  - **[2026-02-09]** Full JWT auth: `supabase.auth.getUser(token)` + store ownership verification. 6-level error handling (401/400/403/500).
  - **[2026-02-09]** CORS headers on all responses including OPTIONS preflight.

  #### Browser Notification Utility
  - **[2026-02-09]** Created `src/lib/browser-notifications.ts` (~38 lines) with 4 exported functions:
    - `isBrowserNotificationSupported()` — checks `'Notification' in window`
    - `getBrowserPermission()` — returns current permission state or `'unsupported'`
    - `requestBrowserPermission()` — async `Notification.requestPermission()` wrapper
    - `sendBrowserNotification(alertType, productName, body)` — creates desktop notification with Turkish alert titles, tag-based dedup, `/vite.svg` icon

  #### Hook: `useNotifications`
  - **[2026-02-09]** Created `src/hooks/useNotifications.ts` (~110 lines) managing full notification settings lifecycle.
  - **[2026-02-09]** State: `settings`, `loading`, `saving`, `testingTelegram`, `testResult`.
  - **[2026-02-09]** `save()` implements UPSERT logic — UPDATE if row exists, INSERT if not. Auto-stamps `updated_at`.
  - **[2026-02-09]** `testTelegram(botToken, chatId)` calls Edge Function with JWT auth, writes result to `testResult` state.

  #### UI Components (3 new components)
  - **[2026-02-09]** **`TelegramSettings`** (~140 lines):
    - Master toggle switch with "Aktif" green badge
    - 2-step setup guide (BotFather instructions + Chat ID instructions)
    - Bot Token (password input) + Chat ID inputs
    - "Test Gonder" button (Send icon, loading spinner, success/error feedback)
    - "Kaydet" button (appears only when inputs are dirty — isDirty detection)
    - External link to Telegram Bot documentation
  - **[2026-02-09]** **`BrowserNotifSettings`** (~115 lines):
    - Auto-detects browser support, permission state (`granted`/`denied`/`default`/`unsupported`)
    - "Bildirim Izni Ver" button when permission is `default`
    - Red warning when permission is `denied` (directs to browser settings)
    - Red badge when browser doesn't support notifications
    - Toggle switch (only active when permission granted)
    - "Test Bildirimi Gonder" button + 3-second success indicator
  - **[2026-02-09]** **`AlertPreferences`** (~110 lines):
    - 4 notification type toggles (Price Drop, Margin Warning, Stock Change, Competitor Change), each with label + description, instant save on toggle
    - Threshold inputs: "Minimum Marj (%)" (default: 10) and "Fiyat Degisim Esigi (%)" (default: 5)
    - "Esikleri Kaydet" button (appears only when thresholds are dirty)
    - SlidersHorizontal icon header with warning color accent

  #### SettingsPage Integration
  - **[2026-02-09]** Integrated `useNotifications(store.id)` hook into `SettingsPage`.
  - **[2026-02-09]** Updated subtitle: "Hesap ve magaza ayarlari" → "Hesap, magaza ve bildirim ayarlari".
  - **[2026-02-09]** Added 3 notification components below Security card with loading spinner during fetch.

  #### TypeScript Types
  - **[2026-02-09]** Added `notification_settings` to `Database['public']['Tables']` in `src/types/database.ts` with full Row/Insert/Update types and Relationships definition.

  #### Build Verification
  - **[2026-02-09]** Production build: **0 TypeScript errors**, 912.31 KB JS (gzip: 266.11 KB), 33.92 KB CSS (gzip: 6.50 KB).

  #### File Change Matrix
  | File | Action | ~Lines |
  | :--- | :--- | :--- |
  | `supabase/migrations/..._create_notification_settings_table.sql` | NEW (migration) | 85 |
  | `supabase/functions/send-notification/index.ts` | NEW + DEPLOYED | 185 |
  | `src/lib/browser-notifications.ts` | NEW | 38 |
  | `src/hooks/useNotifications.ts` | NEW | 110 |
  | `src/components/settings/TelegramSettings.tsx` | NEW | 140 |
  | `src/components/settings/BrowserNotifSettings.tsx` | NEW | 115 |
  | `src/components/settings/AlertPreferences.tsx` | NEW | 110 |
  | `src/types/database.ts` | UPDATED | +59 |
  | `src/pages/SettingsPage.tsx` | UPDATED | +45 |
  | **TOTAL** | | **~887** |

### [x] Task 4.3: Final Polish (The Premium Touch)
- **Objective:** Micro-animations, transition effects, loading skeletons, and final UI refinements.
- **Changelog:**

  #### CSS Animation System
  - **[2026-02-09]** Added 3 new keyframe animations: `scaleIn` (0.25s ease-out), `pulseSoft` (2s infinite), `shimmer` (1.5s infinite gradient sweep).
  - **[2026-02-09]** Created 6 stagger delay utility classes (`.stagger-1` through `.stagger-6`, 50ms increments) for cascading entry animations.
  - **[2026-02-09]** Enhanced `.glass-card` with smooth `transition: all 0.2s` and `.glass-hover` with `box-shadow` elevation on hover.
  - **[2026-02-09]** Changed all existing animations (`fade-in`, `slide-up`, `slide-in-left`) to use `both` fill mode for proper state retention.

  #### Base UI Component Polish
  - **[2026-02-09]** **Button**: Added `active:scale-[0.97]` press feedback on primary/secondary/danger variants, enhanced hover shadow (`shadow-brand-500/30`), added `focus-visible:ring-2` for keyboard accessibility, `disabled:pointer-events-none`.
  - **[2026-02-09]** **Input**: Enhanced focus state (`ring-2 ring-brand-500/30`, background shift to `surface-800/70`), added `hover:border-white/10` transition, error state gets red focus ring + `animate-fade-in` on error text.
  - **[2026-02-09]** **Card**: `hover` prop activates glass-hover elevation effect.
  - **[2026-02-09]** **StatCard**: Added `tabular-nums` for numeric alignment, icon container gets `transition-colors duration-200`.

  #### Loading Skeleton Components (NEW)
  - **[2026-02-09]** Created `src/components/ui/Skeleton.tsx` with 5 exported components:
    - `Skeleton` — base shimmer block with configurable className/style
    - `StatCardSkeleton` — mirrors StatCard layout (label + value + icon placeholder)
    - `ChartSkeleton` — bar chart placeholder with 7 varying-height columns
    - `TableRowSkeleton` — configurable column count table row placeholder
    - `ProductListSkeleton` — 5-row product list placeholder

  #### Layout Component Polish
  - **[2026-02-09]** **Sidebar**: Active route gets green indicator bar (`w-0.5 bg-brand-500 animate-scale-in`), active icon scales to 110%, logo gets `hover:scale-105` with brand shadow, sign-out button shows `Loader2` spinner during async operation.
  - **[2026-02-09]** **Header**: Notification bell dot gets `animate-pulse-soft` (subtle infinite pulse), both action buttons get `active:scale-95` press feedback.

  #### Page-Level Polish
  - **[2026-02-09]** **DashboardPage**: Loading state replaced with branded skeleton layout (4x StatCardSkeleton + ChartSkeleton + ProductListSkeleton) with stagger classes. CurrencyTicker wrapped in `animate-slide-up`. Each stat card and chart section gets stagger-1 through stagger-6.
  - **[2026-02-09]** **AnalyticsPage**: Enabled Recharts animations on all 5 chart elements — Bar (800ms/1000ms), Pie (800ms/900ms with ease-out easing), Scatter (800ms).
  - **[2026-02-09]** **AuthPage**: Logo gets `hover:scale-110` transition, tab switches now clear error state for cleaner UX.
  - **[2026-02-09]** **ProductsPage**: Empty state enhanced with `Package` icon in branded circle, descriptive subtitle text, `animate-scale-in` entrance.
  - **[2026-02-09]** **CalculatorPage**: Result cards animate in with `animate-scale-in` + stagger, cost breakdown card delayed with `stagger-1`, `CostRow` gets hover highlight + `tabular-nums`.
  - **[2026-02-09]** **TrackingPage**: Loading state replaced with skeleton table (5x TableRowSkeleton), empty state gets `Eye` icon + `animate-scale-in`, alert/advantage cards get stagger animations (`stagger-1`/`stagger-2`).
  - **[2026-02-09]** **AiScenarioPage**: Loading state replaced with layout-matching skeleton, select element styled to match Input component (hover border, focus ring, background transition).
  - **[2026-02-09]** **App Loading Screen**: Branded splash with `TrendingUp` logo icon in brand circle + shimmer progress bar, replacing plain spinner.

  #### Chart Animations
  - **[2026-02-09]** **ProfitChart**: Both Area elements get `isAnimationActive` with 800ms/1000ms duration and `ease-out` easing.
  - **[2026-02-09]** All Recharts components across the app now animate on mount for a polished data reveal effect.

  #### Build Verification
  - **[2026-02-09]** Production build: **0 TypeScript errors**, 918.60 KB JS (gzip: 267.51 KB), 40.35 KB CSS (gzip: 7.37 KB).

  #### File Change Matrix
  | File | Action | Change Summary |
  | :--- | :--- | :--- |
  | `src/styles/index.css` | UPDATED | +3 keyframes, +6 stagger classes, glass-card transitions |
  | `src/components/ui/Button.tsx` | UPDATED | active:scale, focus ring, hover shadow |
  | `src/components/ui/Input.tsx` | UPDATED | focus ring, hover border, error animation |
  | `src/components/ui/Card.tsx` | UPDATED | hover prop for glass-hover |
  | `src/components/ui/Skeleton.tsx` | NEW | 5 skeleton components (~85 lines) |
  | `src/components/dashboard/StatCard.tsx` | UPDATED | tabular-nums, icon transition |
  | `src/components/dashboard/ProfitChart.tsx` | UPDATED | Recharts animation props |
  | `src/components/layout/Sidebar.tsx` | UPDATED | active indicator, sign-out spinner |
  | `src/components/layout/Header.tsx` | UPDATED | pulse animation, press feedback |
  | `src/pages/DashboardPage.tsx` | UPDATED | skeleton loading, stagger animations |
  | `src/pages/AnalyticsPage.tsx` | UPDATED | chart animation props |
  | `src/pages/AuthPage.tsx` | UPDATED | logo hover, error clear on tab |
  | `src/pages/ProductsPage.tsx` | UPDATED | empty state icon, scale-in |
  | `src/pages/CalculatorPage.tsx` | UPDATED | result animations, cost row polish |
  | `src/pages/TrackingPage.tsx` | UPDATED | skeleton loading, stagger cards |
  | `src/pages/AiScenarioPage.tsx` | UPDATED | skeleton loading, select styling |
  | `src/App.tsx` | UPDATED | branded loading screen |

---

## Phase 5: Hesaplama Tutarliligi & Dinamik Kargo Barem Sistemi
**Goal:** Centralize the financial calculation logic and implement a dynamic, database-driven shipping rate (barem) system.

### [x] Task 5.1: Hesaplama Tutarliligi (Calculation Consistency)
- **Objective:** Ensure "Kar Hesapla" and "Urunler" pages use the exact same calculation logic with identical inputs.
- **Changelog:**

  #### Root Cause Analysis
  - **[2026-02-09]** Identified that `CalculatorPage` was standalone (no store context), using hardcoded desi rates only, while `useProducts` used the same `calculateProfit()` but with store-aware shipping cost resolution.
  - **[2026-02-09]** Both modules already shared `financial-engine.ts`, but Calculator lacked access to dynamic barem data and store marketplace context.

  #### Financial Engine Refactor
  - **[2026-02-09]** Exported `ProfitInput` interface from `financial-engine.ts` for external consumption.
  - **[2026-02-09]** Added `ShippingRate` interface: `{ rate_type: 'desi' | 'price', min_value, max_value, cost, vat_included }`.
  - **[2026-02-09]** Created `resolveShippingCost(desi, salesPrice, rates)` — hybrid resolver that checks desi-based rates first, then price-based, with fallback to hardcoded defaults.
  - **[2026-02-09]** Created `findMatchingRate(rates, value)` — generic range matcher supporting any sorted rate table.
  - **[2026-02-09]** Maintained `FALLBACK_DESI_RATES` as safety net when DB rates are unavailable.
  - **[2026-02-09]** `getDesiShippingCost()` now accepts optional `ShippingRate[]` parameter for dynamic rates.
  - **[2026-02-09]** `calculateProfit()` remains unchanged — single source of truth for all profit calculations.

  #### Calculator Page Fix
  - **[2026-02-09]** Connected `CalculatorPage` to store context via new props: `shippingRates` and `marketplace`.
  - **[2026-02-09]** Calculator now uses `resolveShippingCost()` with the same dynamic rates as Products page.
  - **[2026-02-09]** Added real-time shipping cost preview showing barem-resolved amount before calculation.
  - **[2026-02-09]** Added "Manuel Kargo" override field — empty = automatic barem, filled = manual override.
  - **[2026-02-09]** Added marketplace badge showing active marketplace (Trendyol/Hepsiburada/Amazon TR).
  - **[2026-02-09]** Added inline "Kargo Barem Tablosu" card showing both Desi and Price-based rate tiers.
  - **[2026-02-09]** Result now shows "(Barem)" or "(Manuel)" label on shipping cost row.

  #### useProducts Hook Update
  - **[2026-02-09]** `useProducts(storeId, shippingRates)` now accepts `ShippingRate[]` as second parameter.
  - **[2026-02-09]** `computeProfit()` uses `resolveShippingCost()` when `shipping_cost === 0` (automatic), or manual override when > 0.
  - **[2026-02-09]** Added reactive recalculation: when `shippingRates` change, all product profits are recalculated automatically.

### [x] Task 5.2: Dinamik Kargo Barem Sistemi (Dynamic Shipping Rate System)
- **Objective:** Replace hardcoded shipping rates with a database-driven, user-customizable barem table.
- **Changelog:**

  #### Database Layer
  - **[2026-02-09]** Created `shipping_rates` table with 11 columns:
    - `id` (uuid PK), `store_id` (nullable FK → stores), `marketplace` (text), `rate_type` ('desi' | 'price'), `min_value` (numeric), `max_value` (numeric), `cost` (numeric), `vat_included` (boolean), `is_active` (boolean), `created_at`, `updated_at`
  - **[2026-02-09]** Design: `store_id IS NULL` = system defaults, `store_id IS NOT NULL` = user overrides.
  - **[2026-02-09]** Unique constraint on `(store_id, marketplace, rate_type, min_value)` using `NULLS NOT DISTINCT`.
  - **[2026-02-09]** 3 indexes: store_id, marketplace, and composite lookup index.
  - **[2026-02-09]** Enabled RLS with 5 restrictive policies:
    - Authenticated users can read system defaults (store_id IS NULL)
    - Users can read/insert/update/delete only their own store's rates
    - INSERT policy enforces store_id IS NOT NULL (users cannot create system defaults)

  #### Default Data Seeding
  - **[2026-02-09]** Seeded 36 default shipping rate rows (3 marketplaces x 12 tiers each):
    - **Trendyol**: 8 desi tiers (0-1: 9.99 TL through 20-30: 59.99 TL) + 4 price tiers (0-50: 14.99 TL, 50-100: 11.99 TL, 100-150: 8.99 TL, 150+: Free)
    - **Hepsiburada**: 8 desi tiers (0-1: 10.99 TL through 20-30: 62.99 TL) + 4 price tiers (0-50: 15.99 TL, 50-100: 12.99 TL, 100-150: 9.99 TL, 150+: Free)
    - **Amazon TR**: 8 desi tiers (0-1: 11.99 TL through 20-30: 64.99 TL) + 4 price tiers (0-50: 16.99 TL, 50-100: 13.99 TL, 100-200: 9.99 TL, 200+: Free)
  - **[2026-02-09]** All costs stored as KDV-included (Turkish marketplace standard).
  - **[2026-02-09]** Used `ON CONFLICT DO NOTHING` for idempotent seeding.

  #### Hook: `useShippingRates`
  - **[2026-02-09]** Created `src/hooks/useShippingRates.ts` (~130 lines):
    - Fetches both system defaults and store-specific overrides in parallel
    - `mergeRates()` — intelligent merge: store overrides replace matching system defaults by `(rate_type, min_value)` key
    - `upsertRate()` — creates or updates a store-specific rate with `ON CONFLICT` upsert
    - `deleteStoreRate()` — removes a single store override
    - `resetToDefaults()` — bulk deletes all store overrides for the marketplace
    - `hasCustomRates` — boolean flag indicating whether user has any custom rates
    - Auto-refetches after every mutation

  #### UI: ShippingBaremSettings Component
  - **[2026-02-09]** Created `src/components/settings/ShippingBaremSettings.tsx` (~300 lines):
    - Displays Desi-based and Price-based rate tables side by side
    - Inline editing: click any row to edit max_value and cost
    - "Kademe Ekle" form: add new rate tier with type, min, max, cost fields
    - "Varsayilana Don" button: resets all custom rates to system defaults
    - "Ozel" badge when user has custom rates
    - Marketplace label in card header

  #### App Integration
  - **[2026-02-09]** `App.tsx` now initializes `useShippingRates(store.id, store.marketplace)` at top level.
  - **[2026-02-09]** Shipping rates passed down to `useProducts`, `CalculatorPage`, and `SettingsPage`.
  - **[2026-02-09]** Combined loading state: `isLoading = productsLoading || ratesLoading`.

  #### TypeScript Types
  - **[2026-02-09]** Added `shipping_rates` to `Database['public']['Tables']` in `src/types/database.ts` with full Row/Insert/Update types.

  #### Build Verification
  - **[2026-02-09]** Production build: **0 TypeScript errors**, 931.31 KB JS (gzip: 270.34 KB), 42.79 KB CSS (gzip: 7.56 KB).

  #### File Change Matrix
  | File | Action | Change Summary |
  | :--- | :--- | :--- |
  | `supabase/migrations/..._create_shipping_rates_table.sql` | NEW (migration) | 95 lines |
  | `supabase/migrations/..._seed_default_shipping_rates.sql` | NEW (migration) | 80 lines |
  | `src/lib/financial-engine.ts` | REFACTORED | +ShippingRate, +resolveShippingCost, +findMatchingRate, +FALLBACK_DESI_RATES |
  | `src/hooks/useShippingRates.ts` | NEW | ~130 lines |
  | `src/hooks/useProducts.ts` | UPDATED | +shippingRates param, +resolveShippingCost, +reactive recalc |
  | `src/pages/CalculatorPage.tsx` | REWRITTEN | +shippingRates/marketplace props, +barem preview, +manual override |
  | `src/pages/SettingsPage.tsx` | UPDATED | +ShippingBaremSettings, +storeId/marketplace props |
  | `src/components/settings/ShippingBaremSettings.tsx` | NEW | ~300 lines |
  | `src/types/database.ts` | UPDATED | +shipping_rates types |
  | `src/App.tsx` | UPDATED | +useShippingRates, +rates wiring |

---

## Phase 6: Operasyonel Derinlik & Kampanya Yonetimi
**Goal:** Enterprise-grade order tracking with cart-level profit analysis, JIT campaign commission system, advanced packaging/return cost layers, and Amazon multi-logistics support.

### Technical Architecture Decision: Time-Scheduled Commissions
**Decision:** Option B — Just-in-Time (JIT) Date Check (PM Approved)

**Rationale:**
- Every profit calculation checks `NOW() BETWEEN valid_from AND valid_until` at resolve time
- Zero infrastructure dependency (no cron jobs, no Edge Function schedulers)
- Nanosecond-accurate campaign transitions (vs. cron's minute-level granularity)
- Same resolution pattern already proven in `useShippingRates` — apply to commissions
- `commission_schedules` table rows are "passive" — they become active/inactive automatically based on current timestamp
- No failure modes, no retry logic, no monitoring required

### [x] Task 6.1: Siparisler Modulu — Database & Backend (The Orders Hub)
**Objective:** Create order tracking with cart-level profit analysis and campaign split tracking.

**Changelog:**

#### Database Layer: `orders` Table
- **[2026-02-10]** Created `orders` table with 15 columns:
  - `id` (uuid PK), `store_id` (uuid FK → stores, NOT NULL, ON DELETE CASCADE)
  - `order_number` (text) — Marketplace order number (e.g., "TY-123456")
  - `marketplace_order_id` (text) — External marketplace ID
  - `order_date` (timestamptz) — When the order was placed
  - `total_amount` (numeric) — Total cart value (sum of all line items)
  - `total_shipping` (numeric) — Barem-resolved shipping for the entire cart
  - `total_commission` (numeric) — Sum of commission across all items
  - `total_profit` (numeric) — Calculated net profit for the entire order
  - `campaign_name` (text) — Active campaign at time of order (if any)
  - `campaign_seller_share` (numeric, default 0) — % of discount borne by seller (0-1)
  - `campaign_marketplace_share` (numeric, default 0) — % of discount borne by marketplace (0-1)
  - `status` (text, default 'pending') — Order status: 'pending' / 'shipped' / 'delivered' / 'returned' / 'cancelled'
  - `notes` (text, default '') — Optional user notes
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
- **[2026-02-10]** Applied index on `store_id` for fast store-level queries.
- **[2026-02-10]** Applied composite index on `(store_id, order_date DESC)` for timeline pagination.
- **[2026-02-10]** Applied index on `status` for status-based filtering.

#### Database Layer: `order_items` Table
- **[2026-02-10]** Created `order_items` table with 13 columns:
  - `id` (uuid PK), `order_id` (uuid FK → orders, NOT NULL, ON DELETE CASCADE)
  - `product_id` (uuid FK → products, ON DELETE SET NULL) — Nullable for snapshot persistence
  - `product_name` (text, NOT NULL) — Denormalized snapshot (survives product deletion)
  - `quantity` (integer, NOT NULL, default 1) — Units ordered
  - `unit_price` (numeric, NOT NULL, default 0) — Price at time of sale
  - `buy_price_at_sale` (numeric, NOT NULL, default 0) — Buy price snapshot
  - `commission_rate_at_sale` (numeric, NOT NULL, default 0.15) — Resolved commission rate at sale time
  - `vat_rate_at_sale` (integer, NOT NULL, default 20) — VAT rate snapshot
  - `shipping_share` (numeric, NOT NULL, default 0) — This item's proportional share of total shipping cost
  - `extra_cost` (numeric, NOT NULL, default 0) — Per-unit extra costs
  - `ad_cost` (numeric, NOT NULL, default 0) — Per-unit ad costs
  - `net_profit` (numeric, NOT NULL, default 0) — Pre-calculated profit for this line item
  - `created_at` (timestamptz, default now())
- **[2026-02-10]** Applied index on `order_id` for fast item retrieval per order.
- **[2026-02-10]** Applied index on `product_id` for reverse product→order lookups.

#### Row Level Security (RLS)
- **[2026-02-10]** Enabled RLS on `orders` table with 4 restrictive policies:
  - **"Users can view own orders"** — SELECT policy checking `EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())`
  - **"Users can create own orders"** — INSERT policy with same ownership check + WITH CHECK for store_id validation
  - **"Users can update own orders"** — UPDATE policy with dual USING + WITH CHECK clauses
  - **"Users can delete own orders"** — DELETE policy with ownership verification
- **[2026-02-10]** Enabled RLS on `order_items` table with 4 restrictive policies:
  - All policies check via `orders → stores` join: `EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())`
  - SELECT, INSERT, UPDATE, DELETE policies all use this transitive ownership check

#### Cart Shipping Logic (Tek Paket Kurali)
- **[2026-02-10]** Documented cart-level shipping resolution: `resolveShippingCost()` is called with `SUM(unit_price * quantity)` as the salesPrice
- **[2026-02-10]** Shipping cost proportionally distributed to each `order_item.shipping_share` based on item value weight: `(item_total / cart_total) * shipping_cost`
- **[2026-02-10]** This ensures a 300 TL cart with 3 items of 100 TL each gets the "300+ TL" barem tier, not three separate "0-150 TL" tiers

#### TypeScript Types
- **[2026-02-10]** Added `orders` to `Database['public']['Tables']` in `src/types/database.ts`:
  - Full Row/Insert/Update types with 15 columns
  - Relationships definition: `store_id` → `stores`, reverse `order_items` array
- **[2026-02-10]** Added `order_items` to `Database['public']['Tables']`:
  - Full Row/Insert/Update types with 13 columns
  - Relationships: `order_id` → `orders`, `product_id` → `products`

#### Build Verification
- **[2026-02-10]** Migration files created with idempotent `CREATE TABLE IF NOT EXISTS` and `DO $$ BEGIN ... END $$` blocks for safe re-runs.
- **[2026-02-10]** All foreign keys use `ON DELETE CASCADE` (orders → store) and `ON DELETE SET NULL` (order_items → products) for referential integrity.
- **[2026-02-10]** Database ready for frontend integration.

#### File Change Matrix
| File | Action | Lines |
| :--- | :--- | :--- |
| `supabase/migrations/20260210095937_create_orders_table.sql` | NEW (migration) | ~95 |
| `supabase/migrations/20260210095959_create_order_items_table.sql` | NEW (migration) | ~90 |
| `src/types/database.ts` | UPDATED | +120 |
| **TOTAL** | | **~305** |

### [x] Task 6.2: Siparisler Modulu — Frontend (Orders Page + Hook)
**Objective:** Full-featured orders page with cart-level profit visualization.

**Changelog:**

#### Hook: `useOrders`
- **[2026-02-10]** Created `src/hooks/useOrders.ts` (~165 lines) managing full order lifecycle with cart-level profit analysis:
  - **State management**: `orders` (OrderWithItems[]), `loading` (boolean)
  - **`fetchOrders()`** — Loads orders sorted by `order_date DESC` + fetches all associated order_items in parallel via `IN` query, enriches orders with items array
  - **`addOrder(order, items)`** — Transaction-safe order creation:
    1. INSERT order row → returns new order
    2. INSERT batch of order_items with `order_id` FK
    3. Optimistic UI update: prepends new order to state
  - **`updateOrder(id, updates, items?)`** — Order + items update with replace strategy:
    1. UPDATE order row with `updated_at` timestamp
    2. If `items` provided: DELETE all existing items → INSERT new items (full replace)
    3. If `items` undefined: keep existing items unchanged
    4. Returns enriched OrderWithItems
  - **`deleteOrder(id)`** — Cascade delete (order_items auto-deleted via FK)
  - **`refetch()`** — Manual refresh trigger
- **[2026-02-10]** Export `OrderWithItems` interface (Order + items array) and `OrderStatus` union type
- **[2026-02-10]** Cart-aware design: hook receives store_id, returns [] when store not ready

#### Page: OrdersPage
- **[2026-02-10]** Created `src/pages/OrdersPage.tsx` (~370 lines) — Enterprise-grade order management interface:
  - **Search bar** — Full-text search across: order_number, marketplace_order_id, campaign_name, order_items.product_name (searches through item arrays)
  - **Status tabs** (6 tabs with live counters):
    - Tumu (All) / Beklemede (Pending) / Kargoda (Shipped) / Teslim (Delivered) / Iade (Returned) / Iptal (Cancelled)
    - Each tab shows order count badge with dynamic color (brand-500 for active, gray for inactive)
  - **Table columns** (9 columns):
    - Expand button (chevron icon, rotates 180° when expanded)
    - Order # + Campaign name (sub-label)
    - Date (DD/MM/YYYY format)
    - Items count (centered)
    - Total Amount (right-aligned, TL format)
    - Shipping (right-aligned, TL format)
    - Net Profit (color-coded: green for profit, red for loss)
    - Status badge (color-coded by status)
    - Actions (Edit/Delete buttons, fade-in on row hover)
  - **Expandable row detail** — Nested item table with slide-down animation showing:
    - Product name, Quantity, Unit Price, Buy Price, Commission %, Shipping, Per-item Net Profit
    - 7-column layout with glassmorphic inner card
  - **Pagination** — 15 items per page, page number buttons (max 5 visible), prev/next arrows, item count display
  - **Empty states**:
    - No orders: ShoppingCart icon + "Ilk Siparisini Ekle" CTA button
    - Filtered empty: "Filtreyle eslesen siparis bulunamadi" + suggestion text
  - **Loading state**: Branded loading spinner (6px circle, brand-500 border)
- **[2026-02-10]** OrderTableRow component extracted for cleaner render logic with hover states and transition animations

#### Component: OrderModal
- **[2026-02-10]** Created `src/components/orders/OrderModal.tsx` (~430 lines) — Full-featured order create/edit modal:
  - **Order metadata section** (3-column grid):
    - Siparis No, Pazaryeri ID, Siparis Tarihi (datetime-local input)
    - Kampanya Adi, Satici Payi (%), Durum (5-option select)
  - **Dynamic line items section**:
    - "Kalem Ekle" button (Plus icon) adds empty row
    - Each row (12-column responsive grid):
      - Product dropdown (5 cols) — selects from existing products, auto-fills all fields
      - Quantity input (1 col, centered)
      - Unit Price (2 cols, right-aligned number input)
      - Buy Price (2 cols, right-aligned number input)
      - Live profit display (1 col, color-coded)
      - Delete button (1 col, Trash2 icon, disabled when only 1 row)
    - Collapsible advanced fields per row (5 mini inputs):
      - Komisyon %, KDV %, Kargo, Ek Gider, Reklam
  - **Real-time profit calculation** — `computeLineProfit()` uses `calculateProfit()` from financial-engine, recalculates on any field change
  - **Product auto-fill logic** — Selecting product from dropdown:
    1. Copies product.name → product_name
    2. Copies product.sales_price → unit_price
    3. Copies product.buy_price → buy_price_at_sale
    4. Copies product commission/VAT/costs → respective fields
    5. Resolves shipping via `resolveShippingCost(desi, sales_price, shippingRates)`
    6. Auto-calculates net_profit
  - **Cart totals summary** (4-column display, glassmorphic card):
    - Toplam Tutar (sum of unit_price × quantity)
    - Kargo (sum of shipping_share)
    - Komisyon (sum of commission)
    - Net Kar (sum of net_profit, color-coded)
  - **Notes textarea** — Multi-line text input for order notes
  - **Validation** — Checks for empty product name, missing order number before save
  - **Save/Cancel footer** — Dual-button layout with loading states
- **[2026-02-10]** Modal shows "Yeni Siparis" title for create, "Siparisi Duzenle" for edit
- **[2026-02-10]** Receives `products` and `shippingRates` as props for live resolution

#### Component: OrderDeleteConfirm
- **[2026-02-10]** Created `src/components/orders/OrderDeleteConfirm.tsx` (~40 lines):
  - AlertTriangle icon in danger circle
  - Displays order number in confirmation message
  - "Iptal" + "Sil" buttons (danger variant)
  - Loading state on confirm button ("Siliniyor..." text)
  - Backdrop blur + click-outside-to-close

#### App Integration
- **[2026-02-10]** **App.tsx** changes:
  - Imported `useOrders`, `OrdersPage`
  - Initialized `useOrders(store?.id)` at top level
  - Added `/orders` route between `/products` and `/calculator`
  - Passed 7 props to OrdersPage: orders, loading, products, shippingRates, onAdd, onUpdate, onDelete
  - Combined loading state: `loading={isLoading || ordersLoading}` for unified spinner control
- **[2026-02-10]** **Sidebar.tsx** changes:
  - Imported `ShoppingCart` icon from lucide-react
  - Added "Siparisler" nav item with `/orders` href (positioned after "Urunler")
  - Active state indicator (green bar) + hover states follow existing design pattern

#### UX Polish Details
- **[2026-02-10]** Status color mapping:
  - `pending` → warning (yellow/amber)
  - `shipped` → neutral (gray)
  - `delivered` → success (green)
  - `returned` → danger (red)
  - `cancelled` → danger (red)
- **[2026-02-10]** Turkish status labels: Beklemede, Kargoda, Teslim Edildi, Iade, Iptal
- **[2026-02-10]** All numeric displays use `tabular-nums` font-feature for vertical alignment
- **[2026-02-10]** All currency displays use `toLocaleString('tr-TR')` + " TL" suffix
- **[2026-02-10]** Modal max-height: 90vh with internal scroll for long order item lists
- **[2026-02-10]** Expandable rows use `animate-slide-up` CSS class for smooth reveal

#### Build Verification
- **[2026-02-10]** Production build: **0 TypeScript errors**, 959.08 KB JS (gzip: 275.13 KB), 44.87 KB CSS (gzip: 7.84 KB)
- **[2026-02-10]** All imports resolved successfully
- **[2026-02-10]** Type safety: Full TypeScript coverage with Database types for Insert/Update operations

#### File Change Matrix
| File | Action | Lines |
| :--- | :--- | :--- |
| `src/hooks/useOrders.ts` | NEW | ~165 |
| `src/pages/OrdersPage.tsx` | NEW | ~370 |
| `src/components/orders/OrderModal.tsx` | NEW | ~430 |
| `src/components/orders/OrderDeleteConfirm.tsx` | NEW | ~40 |
| `src/App.tsx` | UPDATED | +4 imports, +3 hook lines, +14 route lines |
| `src/components/layout/Sidebar.tsx` | UPDATED | +1 import, +1 navItem entry |
| **TOTAL** | | **~1025** |

### [ ] Task 6.3: Zaman Ayarli Komisyon Sistemi (JIT Commission Resolution)
**Objective:** Campaign-aware commission rates with date-range scheduling, resolved at calculation time.

**Database Table:**

#### `commission_schedules` table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid PK | Auto-generated |
| `store_id` | uuid FK → stores | NOT NULL, ON DELETE CASCADE |
| `product_id` | uuid FK → products | NULL = store-wide, NOT NULL = product-specific |
| `marketplace` | text | NOT NULL |
| `normal_rate` | numeric | Standard commission rate (0-1) |
| `campaign_rate` | numeric | Campaign commission rate (0-1) |
| `campaign_name` | text | "Flash Indirim", "Ramazan", etc. |
| `valid_from` | timestamptz | Campaign start (inclusive) |
| `valid_until` | timestamptz | Campaign end (exclusive) |
| `seller_discount_share` | numeric | Seller's share of any price discount (0-1) |
| `marketplace_discount_share` | numeric | Marketplace's share (0-1) |
| `is_active` | boolean | Soft delete, default true |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**Resolution Logic (JIT):**
```
resolveCommissionRate(productId, marketplace, storeId, now):
  1. Check commission_schedules WHERE product_id = productId AND now BETWEEN valid_from AND valid_until → use campaign_rate
  2. Check commission_schedules WHERE product_id IS NULL AND now BETWEEN valid_from AND valid_until → use store-wide campaign_rate
  3. Fallback to product.commission_rate (manual override on the product)
```

**Scope:**
- [ ] Migration: `commission_schedules` table with RLS
- [ ] `src/hooks/useCommissionSchedules.ts` — CRUD hook
  - `fetchSchedules()` — load all for store
  - `createSchedule()` — add new campaign schedule
  - `updateSchedule()` / `deleteSchedule()` — edit/remove
  - `resolveCurrentRate(productId, marketplace)` — JIT resolution (checks active campaigns)
  - `getUpcomingCampaigns()` — future campaigns sorted by start date
- [ ] TypeScript types in `database.ts`
- [ ] FinanceEngine update: `resolveCommissionRate()` function with JIT date check
- [ ] `useProducts` integration: use resolved commission rate instead of static `product.commission_rate`

### [ ] Task 6.4: Kampanya Komisyon UI (Campaign Commission Interface)
**Objective:** UI for managing time-scheduled commission campaigns.

**Scope:**
- [ ] `src/components/settings/CommissionScheduleSettings.tsx` — Settings panel
  - Active campaigns list with countdown timers (remaining time)
  - Upcoming campaigns with "starts in X" badges
  - Expired campaigns (grayed out, last 30 days)
  - "Yeni Kampanya" form: name, rate, start date/time, end date/time, seller/marketplace share
  - Quick templates: "Flash Indirim (2 saat)", "Haftalik Kampanya", "Ay Sonu"
- [ ] ProductModal enhancement: "Kampanya Komisyonu" collapsible section
  - Shows active campaign badge if product has active campaign
  - Quick "Kampanya Ekle" button → opens inline schedule form
  - Date/time pickers for valid_from / valid_until
  - Real-time preview: "Bu kampanya %15 → %5 komisyon uygulayacak, tahmini kar artisi: +X TL"
- [ ] CalculatorPage enhancement: Campaign-aware commission display
  - If active campaign exists, show strikethrough on normal rate + green campaign rate
  - "(Kampanya: Flash Indirim)" label on commission row

### [ ] Task 6.5: Gelismis Gider Modulleri (Advanced Cost Layers)
**Objective:** Packaging costs with VAT sensitivity, return cost layer, and Amazon multi-logistics.

**Database Changes (products table extension):**

| New Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `packaging_cost` | numeric | 0 | Total packaging cost per unit |
| `packaging_vat_included` | boolean | true | Is packaging cost VAT-inclusive? |
| `return_rate` | numeric | 0 | Expected return % (0-100, e.g., 5 = 5%) |
| `logistics_type` | text | 'standard' | 'standard' / 'fba' / 'easy_ship' |
| `service_fee` | numeric | 0 | Marketplace service fee per order (sabit 2-3 TL) |

**FinanceEngine Changes:**
```
calculateProfit() updated formula:
  totalCost = buyPrice + vat + commission + shippingCost + extraCost + adCost
            + packagingCost (VAT-adjusted) + serviceFee + (returnCost = salesPrice * returnRate/100 * returnShippingFactor)
```

**Scope:**
- [ ] Migration: ALTER products ADD COLUMN packaging_cost, packaging_vat_included, return_rate, logistics_type, service_fee
- [ ] TypeScript types update
- [ ] `financial-engine.ts` update: extended `ProfitInput` with packaging, return, service fee
- [ ] `ProfitResult` type update: add `packagingCost`, `returnCost`, `serviceFee` fields

### [ ] Task 6.6: Paketleme & Lojistik UI (Packaging Popup + Amazon Templates)
**Objective:** Professional packaging cost popup and Amazon FBA/Seller/EasyShip logistics templates.

**Scope:**
- [ ] `src/components/products/PackagingPopup.tsx` — Packaging cost builder popup
  - Item list: Koli, Bant, Patpat/Balonlu Naylon, Etiket, Diger
  - Each item: Name, Unit Cost, Quantity, KDV Dahil/Haric toggle
  - Auto-sum: Total packaging cost (VAT-adjusted)
  - Save → writes to product.packaging_cost + product.packaging_vat_included
  - Preset templates: "Standart Koli (3.50 TL)", "Fragile Paket (7.00 TL)", "Zarf (1.50 TL)"
- [ ] ProductModal enhancement: "Paketleme" button → opens PackagingPopup
  - Shows current packaging cost as inline badge
  - "Detayli Paketleme" link to open popup
- [ ] ProductModal enhancement: "Iade Orani (%)" input field
  - Tooltip: "Tahmini iade orani. Kar hesabina iade lojistik maliyeti olarak yansir."
  - Shows calculated return cost preview
- [ ] ProductModal enhancement: "Lojistik Tipi" dropdown (Amazon TR only)
  - Options: Standart Gonderim, FBA (Fulfillment by Amazon), Kolay Gonderi (Easy Ship)
  - Each option shows different shipping cost structure explanation
  - FBA: Uses Amazon's fulfillment fee table (stored in shipping_rates with logistics_type filter)
  - Easy Ship: Amazon picks up from seller, different rate structure
- [ ] `src/components/settings/ServiceFeeSettings.tsx` — Global marketplace service fee config
  - Per-marketplace "Hizmet Bedeli" input (default: Trendyol 2.50 TL, Hepsiburada 2.00 TL, Amazon 3.00 TL)
  - Saves to a new `marketplace_settings` row or to store-level config
- [ ] CalculatorPage / Products table: Updated cost breakdown showing packaging + return + service fee rows

### Impact Analysis Summary

| Area | Files Affected | New Files | DB Changes | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Task 6.1** (Orders DB) | `database.ts` | 2 migrations | +2 tables, +8 RLS policies | ✅ DONE |
| **Task 6.2** (Orders UI) | `App.tsx`, `Sidebar.tsx` | `OrdersPage.tsx`, `useOrders.ts`, `OrderModal.tsx`, `OrderDeleteConfirm.tsx` | — | ✅ DONE |
| **Task 6.3** (Commission DB) | `database.ts`, `financial-engine.ts`, `useProducts.ts` | `useCommissionSchedules.ts`, 1 migration | +1 table, +4 RLS policies |
| **Task 6.4** (Commission UI) | `ProductModal.tsx`, `CalculatorPage.tsx`, `SettingsPage.tsx` | `CommissionScheduleSettings.tsx` | — |
| **Task 6.5** (Costs DB) | `database.ts`, `financial-engine.ts`, `types/index.ts` | 1 migration | +5 columns on products |
| **Task 6.6** (Costs UI) | `ProductModal.tsx`, `CalculatorPage.tsx`, `SettingsPage.tsx` | `PackagingPopup.tsx`, `ServiceFeeSettings.tsx` | — |

**Progress:**
- **Completed:** Tasks 6.1 & 6.2 — 4 new files, 2 migrations, ~1330 lines of code
- **Remaining:** Tasks 6.3-6.6 — ~11 new files, ~1 migration, ~1170 lines estimated

---

# 3. 📉 Technical Debt & Known Issues
*> Use this section to log "Todo" items or hacks that need refactoring later.*

| ID | Severity | Description | Proposed Fix |
| :--- | :--- | :--- | :--- |
| **TD-004** | Low | Hardcoded Category Colors | Move palette to global config theme |
