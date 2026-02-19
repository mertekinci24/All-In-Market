
# 🛠️ 01_Technical_Deep_Dive.md

This file contains **ALL TECHNICAL DETAILS**: Architecture, Specifications, Database, Security, Testing, and Code Examples.

---

# PART 1: SYSTEM ARCHITECTURE & STACK
## 1. Stack Detayları
- **Frontend:** Vite + React + TypeScript, Tailwind CSS, Shadcn/UI.
- **Backend (Core):** Supabase Edge Functions (TypeScript) + Python (AI Service).
- **Veritabanı:** Bolt Database (PostgreSQL compatible).
- **Extension:** Chrome Manifest V3.

## 2. İletişim Protokolü
- **Extension -> Edge Function:** `POST /functions/v1/product-sync` (Secure w/ JWT)
- **Dashboard -> Database:** Supabase Client (Direct DB Access w/ RLS)

## 3. Deployment (Docker)
- **Backend:** Python 3.11-slim, Multi-stage build.
- **Frontend:** Node 18-alpine.
- **Security:** `GEMINI_API_KEY` and `DATABASE_URL` in `.env`.

---

# PART 2: TECHNICAL SPECIFICATIONS (The "Truth")

## 1. Extension DOM Selector Map (Comprehensive)
**Strategy:** "Resilient Scraping". Try `Primary` -> `Fallback` -> `JSON-LD`.

### A. Trendyol Product Page (`v-2024.1`)
| Field | Primary (CSS) | Fallback (XPath) | JSON-LD Path |
| :--- | :--- | :--- | :--- |
| **Product Name** | `.pr-new-br span` | `//h1[@class='pr-new-br']` | `name` |
| **Brand** | `.pr-new-br a` | `//a[contains(@class,'brand')]` | `brand.name` |
| **Price (Sale)** | `.prc-dsc` | `//span[contains(@class,'prc-dsc')]` | `offers.price` |
| **Price (Original)**| `.prc-org` | `//span[contains(@class,'prc-org')]` | - |
| **Currency** | `.prc-dsc` (Parse suffix) | - | `offers.priceCurrency` |
| **Seller Name** | `.seller-name-text` | `//a[contains(@class,'seller-name')]` | `offers.seller.name` |
| **Seller Score** | `.seller-store-score` | `//div[contains(@class,'store-score')]` | - |
| **Rating** | `.ty-stars-wrapper` | `//div[@class='rating-line']` | `aggregateRating.ratingValue` |
| **Review Count** | `.total-review-count` | `//div[contains(text(),'Değerlendirme')]` | `aggregateRating.reviewCount` |
| **Stock** | `.sold-out-icon` (If exists=0) | `script[type='application/javascript']` | `offers.availability` |
| **Images** | `.base-product-image img` | `//img[@loading='lazy']` | `image` |
| **Campaign** | `.campaign-name` | `//div[contains(@class,'campaign')]` | - |
| **Shipping** | `.cargo-badge` | `//div[contains(text(),'Kargo')]` | - |
| **Description** | `.product-desc` | `//ul[@class='detail-attr-container']` | `description` |
| **Category** | `.breadcrumb` | `//div[@class='breadcrumb-item']` | - |

### B. Hepsiburada Product Page
| Field | Primary (CSS) | Fallback (XPath) |
| :--- | :--- | :--- |
| **Price** | `[data-test-id="price-current-price"]` | `//span[@id="offering-price"]` |
| **Seller** | `.merchantLink__label` | `//span[contains(@class,'seller')]` |
| **Stock** | `[id="addToCart"]` (If disabled) | Text "Gelince Haber Ver" |

---

## 2. API Endpoint Catalog (Full)
**Base URL:** `/api/v1` | **Auth:** Bearer Token

### A. Authentication & Users
- `POST /auth/login` -> `{token, user}`
- `POST /auth/register` -> `{user_id}`
- `GET /users/me` -> `{profile}`
- `PUT /users/settings` -> `{api_keys_encrypted}`

### B. Product Management
- `POST /products/sync` -> **(Critical)** Receives scraped payload.
- `GET /products` -> List products (Pagination + Filtering).
- `GET /products/{id}` -> Detail view + simple stats.
- `PATCH /products/{id}` -> Update cost/stock inputs manually.
- `DELETE /products/{id}` -> Remove tracking.

### C. Financial Intelligence
- `GET /finance/profit-analysis/{id}` -> Returns `ProfitCalculator` results.
- `GET /finance/dashboard-stats` -> Aggregate Revenue, Net Profit, ROI.
- `POST /finance/simulate` -> AI Scenario input (`target_price`) -> Output.

### D. External Integrations
- `GET /external/currency` -> Fetch USD/EUR from TCMB/Cache.
- `GET /external/competitor-check` -> Trigger background scraping job.

---

## 3. Database Schema (Drizzle ORM)
```typescript
// Core Tables
export const users = pgTable('users', { id: uuid('id').primaryKey(), ... });

export const stores = pgTable('stores', { 
  id: uuid('id').primaryKey(), 
  marketplace: text('marketplace').notNull(),
  apiKeyEncrypted: text('api_key_enc'), 
  iv: text('iv') 
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id').references(()=>stores.id),
  externalId: text('ext_id'), // "p-12345"
  name: text('name'),
  buyPrice: decimal('buy_price').notNull(),
  currentSalesPrice: decimal('sales_price'),
  competitorPrice: decimal('comp_price'),
  commissionRate: decimal('comm_rate').default('0.15'),
  vatRate: integer('vat_rate').default(20),
  desi: decimal('desi').default('1.0'),
  stockStatus: text('stock').default('InStock'),
  lastScraped: timestamp('last_scraped')
});

export const snapshots = pgTable('snapshots', { ... }); // History
```

---

# PART 3: SECURITY & COMPLIANCE
- **API Keys:** Must be encrypted using `AES-256-GCM` before storage.
- **Access Control:** Middleware checks `store_id` on every request.
- **Inputs:** Validate ALL scraped data types (String -> Float conversion safe handling).

---

# PART 4: REFERENCE CODE LIBRARY (Examples)

## A. Extension Scraper (Resilience Logic)
```typescript
// examples/extension/content-script.ts
const Strategies = {
  trendyol: { selectors: { price: ['.prc-dsc', '.prc-org'] } }
};
function getPrice() {
   // Try primary, then fallback
   return document.querySelector(Strategies.trendyol.selectors.price[0])?.textContent;
}
```

## B. Financial Engine (Python)
```python
# examples/backend/engine.py
class FinancialEngine:
    def calculate_net_profit(self, sales_price, buy_cost, commission, shipping):
        # $$ P_{net} = S - (C + V + M + S) $$
        vat = sales_price - (sales_price / 1.20)
        total_cost = buy_cost + (sales_price * commission) + shipping
        return sales_price - total_cost
```

## C. AI Integration (Gemini)
```python
# examples/ai/integrator.py
prompt = f"""
Product: {name}
Competitor: {comp_price}
Task: Decide strict action (MATCH/HOLD).
"""
```

---

# PART 5: TESTING REQUIREMENTS
- **Unit:** Backend (85%), Shared Utils (95%).
- **E2E:** Verify "Scrape -> Save -> Dashboard" flow completely.
- **Perf:** API < 200ms.
