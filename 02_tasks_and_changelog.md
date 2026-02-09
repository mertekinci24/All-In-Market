
# 📋 02_Tasks_and_Changelog.md

This is the **LIVING STATE** of the project.
**AI Instruction:** After completing a step, update this file immediately.

---

# 1. 🚦 Project Status Board
**Current Phase:** Phase 4 (AI & Optimization)
**Active Task:** None (Phase 4 Complete)
**Last Completed:** Task 4.3 (Final Polish)

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

# 3. 📉 Technical Debt & Known Issues
*> Use this section to log "Todo" items or hacks that need refactoring later.*

| ID | Severity | Description | Proposed Fix |
| :--- | :--- | :--- | :--- |
| **TD-002** | Medium | Using Bolt DB (Prototype) | Plan migration to PostgreSQL for Production |
| **TD-004** | Low | Hardcoded Category Colors | Move palette to global config theme |
