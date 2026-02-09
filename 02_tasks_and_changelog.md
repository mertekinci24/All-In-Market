
# 📋 02_Tasks_and_Changelog.md

This is the **LIVING STATE** of the project.
**AI Instruction:** After completing a step, update this file immediately.

---

# 1. 🚦 Project Status Board
**Current Phase:** Phase 5 (Hesaplama Tutarliligi & Dinamik Kargo Barem)
**Active Task:** None (Phase 5 Complete)
**Last Completed:** Task 5.2 (Dinamik Kargo Barem Sistemi)

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

# 3. 📉 Technical Debt & Known Issues
*> Use this section to log "Todo" items or hacks that need refactoring later.*

| ID | Severity | Description | Proposed Fix |
| :--- | :--- | :--- | :--- |
| **TD-004** | Low | Hardcoded Category Colors | Move palette to global config theme |
