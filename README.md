# 🚀 Sky-Market

**AI-Powered E-Commerce Intelligence Platform for Trendyol**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e.svg)](https://supabase.com/)
[![Security Grade](https://img.shields.io/badge/Security-A--Grade-brightgreen.svg)](#security-architecture)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Status:** ✅ MVP-1 Launch Ready (2026-03-15)

Sky-Market is a next-generation product research and financial analysis platform built specifically for Trendyol sellers. Combining real-time data mining, advanced AI-powered opportunity scoring, and comprehensive financial modeling, Sky-Market empowers sellers to make data-driven decisions with confidence.

---

## 🎯 Vision

Transform e-commerce product research from guesswork into science. Sky-Market analyzes thousands of data points across profitability, demand, competition, and logistics to surface hidden opportunities before your competitors do.

---

## ✨ Core Features

### 🧠 S-Curve Opportunity Score Engine
- **Multi-Dimensional Analysis:** 4 pillars (Profitability, Demand, Competition, Logistics) with 20+ weighted metrics
- **Velocity Formula:** Real-time traffic + basket conversion rate tracking
- **Normalization Engine:** Statistical distribution analysis for fair cross-category comparison
- **Score Range:** 0-100 with confidence intervals

### 🔐 7-Strategy Bulletproof Parser
- **1,089 Lines of Defensive Code:** Handles 13 extraction strategies with cascading fallbacks
- **Stock Detection:** DOM selectors, button states, meta tags, JSON-LD, and OG property parsing
- **Rich Data Extraction:** Variants, seller metrics, badges, delivery time, category paths
- **Error Resilience:** Graceful degradation on malformed HTML or A/B test layouts

### 🤖 Gemini 2.0 Flash AI Analysis
- **Competitive Positioning:** Market gap analysis and differentiation strategies
- **Review Sentiment Mining:** Turkish language NLP for customer pain points
- **Seasonality Forecasting:** 12-month demand prediction with confidence scoring
- **Strategic Recommendations:** Actionable insights based on opportunity score components

### 🔒 Multi-Tab Secure Session Management
- **Token Mutex:** Race condition prevention across 10+ concurrent Dashboard tabs
- **5-Retry Exponential Backoff:** Cold-start Service Worker synchronization (2s → 32s)
- **Runtime Credential Injection:** Zero hardcoded secrets, environment-based config only
- **Cross-Domain Auth Bridge:** Dashboard ↔ Extension session sync via Chrome messaging API

### 📊 Financial Modeling Suite
- **Amazon FBA Calculator:** Real commission schedules, shipping barematics, desi weight
- **Multi-Currency Support:** Live TRY/USD rates with historical tracking
- **Export Engine:** Excel (exceljs) and PDF (jspdf) reports with custom branding
- **AI Scenario Planner:** "What-if" analysis for pricing, volume, and cost variations

### 📈 Analytics & Intelligence
- **Competitor War Map:** Historical price snapshots with aggressive pricing detection
- **Keyword Tracking:** SERP rank monitoring with position change alerts
- **Traffic Analytics:** View-to-cart conversion funnel visualization
- **Category Heatmap:** Saturation vs. opportunity matrix

---

## 🏗️ Security Architecture

### A- Security Grade Highlights

**Zero Hardcoded Secrets:**
- All API keys loaded from environment variables at runtime
- Supabase connection strings injected via Vite env (`import.meta.env`)
- Extension credentials stored in encrypted `chrome.storage.local` (AES-256)

**Row-Level Security (RLS):**
- Every database table protected with `auth.uid()` policies
- No user can access another user's data (verified in migration files)
- Restrictive-by-default: Tables locked until explicit policies added

**Content Security Policy:**
- Extension manifest V3 with isolated worlds
- No `eval()` or inline scripts allowed
- All external API calls proxied through Edge Functions

**Audit Trail:**
- Technical logs table tracks all critical operations (TD-18)
- Token refresh attempts logged with timestamps
- Failed auth attempts recorded for anomaly detection

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19.2 + TypeScript 5.9 | Type-safe UI components |
| **Styling** | Tailwind CSS 4.1 | Utility-first design system |
| **State Management** | React Hooks + Custom Stores | Lightweight, no Redux overhead |
| **Charts** | Recharts 3.7 | Responsive data visualization |
| **Database** | Supabase Postgres | Real-time subscriptions + RLS |
| **Backend** | Supabase Edge Functions (Deno) | Serverless Gemini AI proxies |
| **Extension** | Chrome Manifest V3 | Cross-origin data extraction |
| **Build Tool** | Vite 7.3 | Fast HMR, optimized bundles |
| **AI Model** | Gemini 2.0 Flash | 1M context, multimodal analysis |

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 20+ and npm 10+
- Chrome Browser (latest stable)
- Supabase account ([free tier](https://supabase.com/))
- Google AI Studio account ([Gemini API key](https://ai.google.dev/))

### 1. Clone Repository

```bash
git clone https://github.com/your-username/sky-market.git
cd sky-market
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Connection (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Extension ID (Required after loading extension)
# Find at chrome://extensions (Developer Mode → Details → ID)
VITE_EXTENSION_ID=your-chrome-extension-id-here
```

**Where to find these values:**
1. **Supabase URL/Key:** Supabase Dashboard → Settings → API
2. **Extension ID:** Load extension (step 4), then copy ID from `chrome://extensions`

### 3. Configure Supabase Secrets

Deploy Edge Functions and set Gemini API key:

```bash
# Login to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Set Gemini API key (get from https://ai.google.dev/)
npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here

# Deploy all Edge Functions
npx supabase functions deploy
```

**Required Secrets:**
- `GEMINI_API_KEY` → Used by `analyze-product`, `analyze-reviews`, `ai-advisor`, `gemini-product-chat`, `predict-seasonality`

### 4. Run Database Migrations

```bash
# Push schema to Supabase
npx supabase db push

# Verify migrations applied
npx supabase db diff
# Should show: "No schema differences detected"
```

### 5. Build Extension

```bash
# Build extension bundle
npm run build:extension

# Output: dist-extension/
```

### 6. Load Extension in Chrome

1. Open Chrome → Navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist-extension/` folder
5. Copy the **Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
6. Add to `.env` file: `VITE_EXTENSION_ID=<your-extension-id>`

### 7. Start Dashboard

```bash
# Start Vite dev server
npm run dev

# Dashboard available at http://localhost:5173
```

### 8. Test End-to-End Flow

1. **Register Account:**
   - Navigate to `http://localhost:5173`
   - Click "Kayıt Ol" (Sign Up)
   - Enter email + password → Submit

2. **Verify Extension Connection:**
   - Extension icon should show **green checkmark** (may take 2-32s on cold start)
   - If red "X", check Console for retry logs

3. **Mine Product Data:**
   - Visit any Trendyol product page (e.g., `https://www.trendyol.com/marka/urun-p-123456`)
   - Extension badge updates with product title
   - Click badge → Select "Analiz Et" or "Envantere Ekle"

4. **View Analysis:**
   - Return to Dashboard → Navigate to "Ürün Madenciliği" tab
   - Find product in table → Click "AI Analizi"
   - Opportunity Score + Gemini insights load (5-10s)

---

## 🧪 Testing

### Build Verification

```bash
# Test Dashboard build
npm run build
# ✓ Should complete without TypeScript errors

# Test Extension build
npm run build:extension
# ✓ Should output 3 bundles: background.js, content.js, overlay.js
```

### Manual E2E Test Checklist

- [ ] Fresh user registration completes without errors
- [ ] Extension icon turns green after Dashboard login
- [ ] Product page parser extracts all 13 data fields (check Console)
- [ ] "Analiz Et" button triggers AI analysis (check Network tab for `analyze-product` call)
- [ ] Dashboard displays opportunity score (0-100 range)
- [ ] Financial calculator shows profit margins
- [ ] Token refresh works after 1 hour (or force expiry in DevTools)

---

## 📂 Project Structure

```
sky-market/
├── extension/               # Chrome Extension (Manifest V3)
│   ├── background.ts       # Service Worker (auth, token refresh, API proxy)
│   ├── content/            # Content scripts (Trendyol parser, overlay UI)
│   ├── popup/              # Extension popup UI
│   └── manifest.json       # Extension config
├── src/                    # React Dashboard
│   ├── components/         # UI components (analytics, products, settings)
│   ├── hooks/              # Custom React hooks (useAuth, useProducts, etc.)
│   ├── lib/                # Utilities (Supabase client, financial engine)
│   ├── pages/              # Route pages (Dashboard, Research, Calculator)
│   └── types/              # TypeScript definitions
├── supabase/
│   ├── functions/          # Edge Functions (Deno runtime)
│   │   ├── analyze-product/    # Opportunity score calculation
│   │   ├── gemini-product-chat/ # AI chatbot
│   │   └── predict-seasonality/ # Demand forecasting
│   └── migrations/         # Database schema (23 migration files)
├── .env                    # Environment variables (NOT committed)
├── package.json            # Dependencies
└── vite.config.ts          # Vite build config
```

---

## 🚢 Deployment

### Dashboard (Vercel/Netlify)

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod --dir=dist
```

**Environment Variables (Production):**
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to hosting platform
- `VITE_EXTENSION_ID` set to published extension ID (from Chrome Web Store)

### Extension (Chrome Web Store)

1. Build production extension: `npm run build:extension`
2. Zip `dist-extension/` contents
3. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Fill privacy policy + store listing
5. Submit for review (7-14 day approval)

### Database (Already Hosted)

- Supabase handles hosting automatically
- Run migrations: `npx supabase db push --linked`
- Monitor Edge Functions: Supabase Dashboard → Edge Functions → Logs

---

## 🔧 Configuration

### Opportunity Score Weights

Edit `supabase/functions/analyze-product/index.ts`:

```typescript
// Line 46-49: Adjust pillar weights (must sum to 1.0)
const WEIGHT_PROFITABILITY = 0.30  // Margin, ROI, Fees
const WEIGHT_DEMAND = 0.30         // Sales Volume, Velocity
const WEIGHT_COMPETITION = 0.25    // Stock, Ratings, Sellers
const WEIGHT_LOGISTICS = 0.15      // BSR, Shipping
```

### Commission Schedules

Database table: `commission_schedules`

```sql
-- Update Trendyol commission for category
UPDATE commission_schedules
SET commission_rate = 0.12  -- 12%
WHERE platform = 'trendyol'
  AND category_name = 'Elektronik';
```

### Notification Thresholds

Dashboard → Settings → Alerts (per-user configuration)

---

## 🐛 Troubleshooting

### Extension Badge Shows Red "X"

**Cause:** Dashboard not sending auth token to extension

**Solution:**
1. Verify `VITE_EXTENSION_ID` in `.env` matches extension ID
2. Restart dev server: `npm run dev`
3. Reload extension: Chrome → Extensions → ⟳ Reload
4. Check Console: `[Sky Dashboard] Extension sync ✓`

### "Oturum süresi doldu" Error

**Cause:** Token expired and refresh failed

**Solution:**
1. Check Supabase Dashboard → Authentication → Users (verify user exists)
2. Test Edge Function: `curl <supabase-url>/functions/v1/gateway-config`
3. Clear extension storage: DevTools → Application → Storage → Clear
4. Re-login to Dashboard

### AI Analysis Returns 500 Error

**Cause:** Missing `GEMINI_API_KEY` secret

**Solution:**
```bash
# Verify secret is set
npx supabase secrets list
# Should show: GEMINI_API_KEY

# If missing, set it
npx supabase secrets set GEMINI_API_KEY=<your-key>
```

### Parser Returns Empty Data

**Cause:** Trendyol changed HTML structure

**Solution:**
1. Open `extension/content/trendyol-parser.ts`
2. Add new fallback strategy (see lines 250-500 for examples)
3. Rebuild extension: `npm run build:extension`
4. File issue on GitHub with product URL

---

## 📊 Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Dashboard Bundle** | 743 kB (gzip) | Recharts accounts for 60% |
| **Extension Bundle** | 45 kB total | 3 scripts: background, content, overlay |
| **Cold Start Time** | 2-32s | Extension Service Worker wake-up |
| **Product Analysis** | 5-10s | Includes Gemini API round-trip |
| **Lighthouse Score** | 95+ | Performance, Accessibility, Best Practices |
| **Database Queries** | <50ms | Postgres with RLS policies |

---

## 🛡️ Security Best Practices

### For Developers

1. **Never commit `.env` files** → Already in `.gitignore`
2. **Rotate Supabase keys** if exposed → Supabase Dashboard → Settings → API
3. **Use RLS policies** for all new tables → See migration examples
4. **Validate user input** in Edge Functions → Never trust client data

### For Users

1. **Use strong passwords** → 12+ characters, mixed case + symbols
2. **Don't share Extension ID** → Unique per installation
3. **Review permissions** → Extension only accesses `trendyol.com/*`
4. **Report bugs privately** → Email security@skymarket.app (not public issues)

---

## 🗺️ Roadmap

### Post-MVP Features

- [ ] Multi-marketplace support (Amazon, Hepsiburada)
- [ ] Automated repricing rules
- [ ] Telegram bot for real-time alerts
- [ ] Team collaboration (shared stores)
- [ ] Chrome Web Store publication
- [ ] Mobile app (React Native)

### Technical Debt

- [ ] Migrate to Server Components (React 19)
- [ ] Add E2E tests (Playwright)
- [ ] Implement rate limiting on Edge Functions
- [ ] Add Sentry error tracking
- [ ] Bundle size optimization (<500 kB)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

**Commit Convention:** Use [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation:** [Full docs](https://docs.skymarket.app) (coming soon)
- **Issues:** [GitHub Issues](https://github.com/your-username/sky-market/issues)
- **Email:** support@skymarket.app
- **Discord:** [Join community](https://discord.gg/skymarket) (coming soon)

---

## 🙏 Acknowledgments

- **Trendyol** for providing rich product data structures
- **Google AI Studio** for Gemini 2.0 Flash access
- **Supabase** for exceptional DX and generous free tier
- **Vite team** for blazing-fast build tooling

---

**Built with ❤️ by the Sky-Market Team**

*Last Updated: 2026-03-15 | Version: 1.5.1 | Status: MVP-1 Launch Ready*
