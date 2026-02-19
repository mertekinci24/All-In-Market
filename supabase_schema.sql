-- Sky-Market Complete Database Schema
-- Generated to consolidate all migrations into a single execution script.
-- USAGE: Copy and paste this entire script into the Supabase SQL Editor and run it.

-- 1. Create `stores` table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  marketplace text NOT NULL,
  api_key_enc text,
  iv text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stores" ON stores;
CREATE POLICY "Users can view own stores" ON stores FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own stores" ON stores;
CREATE POLICY "Users can create own stores" ON stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stores" ON stores;
CREATE POLICY "Users can update own stores" ON stores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stores" ON stores;
CREATE POLICY "Users can delete own stores" ON stores FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 2. Create `products` table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  buy_price numeric NOT NULL DEFAULT 0,
  sales_price numeric DEFAULT 0,
  competitor_price numeric,
  commission_rate numeric DEFAULT 0.15,
  vat_rate integer DEFAULT 20,
  desi numeric DEFAULT 1.0,
  shipping_cost numeric DEFAULT 0,
  extra_cost numeric DEFAULT 0,
  ad_cost numeric DEFAULT 0,
  stock_status text DEFAULT 'InStock',
  image_url text,
  category text,
  marketplace_url text,
  last_scraped timestamptz,
  -- Advanced Cost Columns (Phase 6.5)
  packaging_cost numeric DEFAULT 0 NOT NULL CHECK (packaging_cost >= 0),
  packaging_vat_included boolean DEFAULT true NOT NULL,
  return_rate numeric DEFAULT 0 NOT NULL CHECK (return_rate >= 0 AND return_rate <= 100),
  logistics_type text DEFAULT 'standard' NOT NULL CHECK (logistics_type IN ('standard', 'fba', 'easy_ship')),
  service_fee numeric DEFAULT 0 NOT NULL CHECK (service_fee >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own products" ON products;
CREATE POLICY "Users can view own products" ON products FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create products in own stores" ON products;
CREATE POLICY "Users can create products in own stores" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
);


-- 3. Create `price_snapshots` table
CREATE TABLE IF NOT EXISTS price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sales_price numeric NOT NULL DEFAULT 0,
  competitor_price numeric,
  buy_price numeric NOT NULL DEFAULT 0,
  net_profit numeric,
  snapshot_date timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_product_id ON price_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON price_snapshots(snapshot_date);
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own snapshots" ON price_snapshots;
CREATE POLICY "Users can view own snapshots" ON price_snapshots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = price_snapshots.product_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create snapshots for own products" ON price_snapshots;
CREATE POLICY "Users can create snapshots for own products" ON price_snapshots FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = price_snapshots.product_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own snapshots" ON price_snapshots;
CREATE POLICY "Users can delete own snapshots" ON price_snapshots FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = price_snapshots.product_id AND stores.user_id = auth.uid())
);


-- 4. Create `shipping_rates` table
CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE, -- NULL = System default
  marketplace text NOT NULL DEFAULT 'trendyol',
  rate_type text NOT NULL DEFAULT 'desi' CHECK (rate_type IN ('desi', 'price', 'fba')),
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  vat_included boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT shipping_rates_unique_range UNIQUE NULLS NOT DISTINCT (store_id, marketplace, rate_type, min_value)
);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_store_id ON shipping_rates(store_id);
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read system defaults" ON shipping_rates;
CREATE POLICY "Authenticated users can read system defaults" ON shipping_rates FOR SELECT TO authenticated USING (store_id IS NULL);

DROP POLICY IF EXISTS "Users can read own store shipping rates" ON shipping_rates;
CREATE POLICY "Users can read own store shipping rates" ON shipping_rates FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = shipping_rates.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create shipping rates for own stores" ON shipping_rates;
CREATE POLICY "Users can create shipping rates for own stores" ON shipping_rates FOR INSERT TO authenticated WITH CHECK (
  store_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM stores WHERE stores.id = shipping_rates.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own store shipping rates" ON shipping_rates;
CREATE POLICY "Users can update own store shipping rates" ON shipping_rates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = shipping_rates.store_id AND stores.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = shipping_rates.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own store shipping rates" ON shipping_rates;
CREATE POLICY "Users can delete own store shipping rates" ON shipping_rates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = shipping_rates.store_id AND stores.user_id = auth.uid())
);


-- 5. Create `orders` table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number text DEFAULT '',
  marketplace_order_id text DEFAULT '',
  order_date timestamptz DEFAULT now(),
  total_amount numeric DEFAULT 0,
  total_shipping numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  campaign_name text DEFAULT '',
  campaign_seller_share numeric DEFAULT 0,
  campaign_marketplace_share numeric DEFAULT 0,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can view their orders" ON orders;
CREATE POLICY "Store owners can view their orders" ON orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can create orders" ON orders;
CREATE POLICY "Store owners can create orders" ON orders FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can update their orders" ON orders;
CREATE POLICY "Store owners can update their orders" ON orders FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can delete their orders" ON orders;
CREATE POLICY "Store owners can delete their orders" ON orders FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
);


-- 6. Create `order_items` table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text DEFAULT '',
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  buy_price_at_sale numeric DEFAULT 0,
  commission_rate_at_sale numeric DEFAULT 0,
  vat_rate_at_sale numeric DEFAULT 20,
  shipping_share numeric DEFAULT 0,
  extra_cost numeric DEFAULT 0,
  ad_cost numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can view their order items" ON order_items;
CREATE POLICY "Store owners can view their order items" ON order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can create order items" ON order_items;
CREATE POLICY "Store owners can create order items" ON order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can update their order items" ON order_items;
CREATE POLICY "Store owners can update their order items" ON order_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can delete their order items" ON order_items;
CREATE POLICY "Store owners can delete their order items" ON order_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM orders JOIN stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid())
);


-- 7. Create `commission_schedules` table
CREATE TABLE IF NOT EXISTS commission_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE, -- NULL = store-wide
  marketplace text NOT NULL,
  normal_rate numeric NOT NULL DEFAULT 0.15,
  campaign_rate numeric NOT NULL DEFAULT 0.15,
  campaign_name text DEFAULT '',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  seller_discount_share numeric NOT NULL DEFAULT 1.0,
  marketplace_discount_share numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commission_schedules_lookup ON commission_schedules(store_id, marketplace, product_id);
ALTER TABLE commission_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedules" ON commission_schedules;
CREATE POLICY "Users can view own schedules" ON commission_schedules FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = commission_schedules.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own schedules" ON commission_schedules;
CREATE POLICY "Users can manage own schedules" ON commission_schedules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = commission_schedules.store_id AND stores.user_id = auth.uid())
);


-- 8. Create `notification_settings` table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  telegram_enabled boolean DEFAULT false,
  telegram_chat_id text,
  telegram_bot_token text,
  browser_enabled boolean DEFAULT true,
  notify_price_drop boolean DEFAULT true,
  notify_margin_warning boolean DEFAULT true,
  notify_stock_change boolean DEFAULT true,
  notify_competitor_change boolean DEFAULT true,
  margin_threshold numeric DEFAULT 20,
  price_change_threshold numeric DEFAULT 5,
  stock_threshold integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_store_notification UNIQUE (store_id)
);
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can view their notification settings" ON notification_settings;
CREATE POLICY "Store owners can view their notification settings" ON notification_settings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = notification_settings.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can update their notification settings" ON notification_settings;
CREATE POLICY "Store owners can update their notification settings" ON notification_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = notification_settings.store_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Store owners can insert their notification settings" ON notification_settings;
CREATE POLICY "Store owners can insert their notification settings" ON notification_settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = notification_settings.store_id AND stores.user_id = auth.uid())
);


-- 9. Seed Data: Default Shipping Rates
-- Trendyol Desi
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included) VALUES
  (NULL, 'trendyol', 'desi', 0, 1, 9.99, true),
  (NULL, 'trendyol', 'desi', 1, 2, 11.99, true),
  (NULL, 'trendyol', 'desi', 2, 3, 13.99, true),
  (NULL, 'trendyol', 'desi', 3, 5, 17.99, true),
  (NULL, 'trendyol', 'desi', 5, 10, 24.99, true),
  (NULL, 'trendyol', 'desi', 10, 15, 34.99, true),
  (NULL, 'trendyol', 'desi', 15, 20, 44.99, true),
  (NULL, 'trendyol', 'desi', 20, 30, 59.99, true)
ON CONFLICT DO NOTHING;

-- Hepsiburada Desi
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included) VALUES
  (NULL, 'hepsiburada', 'desi', 0, 1, 10.99, true),
  (NULL, 'hepsiburada', 'desi', 1, 2, 12.99, true),
  (NULL, 'hepsiburada', 'desi', 2, 3, 14.99, true),
  (NULL, 'hepsiburada', 'desi', 3, 5, 18.99, true),
  (NULL, 'hepsiburada', 'desi', 5, 10, 26.99, true),
  (NULL, 'hepsiburada', 'desi', 10, 15, 36.99, true),
  (NULL, 'hepsiburada', 'desi', 15, 20, 46.99, true),
  (NULL, 'hepsiburada', 'desi', 20, 30, 62.99, true)
ON CONFLICT DO NOTHING;

-- Amazon TR Desi
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included) VALUES
  (NULL, 'amazon_tr', 'desi', 0, 1, 11.99, true),
  (NULL, 'amazon_tr', 'desi', 1, 2, 13.99, true),
  (NULL, 'amazon_tr', 'desi', 2, 3, 15.99, true),
  (NULL, 'amazon_tr', 'desi', 3, 5, 19.99, true),
  (NULL, 'amazon_tr', 'desi', 5, 10, 27.99, true),
  (NULL, 'amazon_tr', 'desi', 10, 15, 37.99, true),
  (NULL, 'amazon_tr', 'desi', 15, 20, 49.99, true),
  (NULL, 'amazon_tr', 'desi', 20, 30, 64.99, true)
ON CONFLICT DO NOTHING;

-- Amazon FBA
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included) VALUES
  (NULL, 'amazon_tr', 'fba', 0, 0.08, 28.50, true),
  (NULL, 'amazon_tr', 'fba', 0.08, 0.46, 34.20, true),
  (NULL, 'amazon_tr', 'fba', 0.46, 0.96, 48.90, true),
  (NULL, 'amazon_tr', 'fba', 0.96, 12, 72.40, true),
  (NULL, 'amazon_tr', 'fba', 12, 999, 145.00, true)
ON CONFLICT DO NOTHING;


-- 10. Phase 10: Product Mining & Intelligence Tables

CREATE TABLE IF NOT EXISTS product_mining (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    marketplace text NOT NULL, -- 'Trendyol', 'Hepsiburada', 'Amazon TR'
    asin text NOT NULL, -- Unique Product ID (ASIN, Barcode, or Marketplace ID)
    title text NOT NULL,
    image_url text,
    current_price numeric,
    opportunity_score numeric DEFAULT 0, -- 0-10 Score
    notes text DEFAULT '',
    is_tracked boolean DEFAULT false, -- If true, it might be moved to 'products' inventory later
    ai_analysis JSONB DEFAULT NULL, -- Stores AI-generated analysis including sentiment, themes, and summary
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Composite unique key to prevent duplicate research entries per store
    UNIQUE(store_id, marketplace, asin)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_mining_store_id ON product_mining(store_id);
CREATE INDEX IF NOT EXISTS idx_product_mining_opportunity ON product_mining(opportunity_score DESC);
-- RLS Policies
ALTER TABLE product_mining ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research" ON product_mining
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = product_mining.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can create research entries" ON product_mining
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = product_mining.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can update own research" ON product_mining
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = product_mining.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own research" ON product_mining
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = product_mining.store_id AND stores.user_id = auth.uid())
    );


-- Keyword Data Table
CREATE TABLE IF NOT EXISTS keyword_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    search_volume int DEFAULT 0, -- Monthly search volume
    cpc numeric DEFAULT 0, -- Cost Per Click estimate
    difficulty int DEFAULT 0, -- 0-100 Difficulty Score
    opportunity_score int DEFAULT 0, -- 0-100 Custom Algo Score
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(store_id, keyword)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_keyword_data_store_volume ON keyword_data(store_id, search_volume DESC);
-- RLS Policies
ALTER TABLE keyword_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keywords" ON keyword_data
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = keyword_data.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can create keywords" ON keyword_data
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = keyword_data.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can update own keywords" ON keyword_data
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = keyword_data.store_id AND stores.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own keywords" ON keyword_data
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM stores WHERE stores.id = keyword_data.store_id AND stores.user_id = auth.uid())
    );


-- Market Metrics Table
CREATE TABLE IF NOT EXISTS market_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_mining_id uuid NOT NULL REFERENCES product_mining(id) ON DELETE CASCADE,
    snapshot_date date DEFAULT CURRENT_DATE,
    
    bsr int, -- Best Seller Rank
    review_count int,
    rating numeric(3, 2), -- e.g., 4.5
    price numeric,
    est_monthly_sales int,
    
    created_at timestamptz DEFAULT now(),
    
    -- Only one metric entry per product per day
    UNIQUE(product_mining_id, snapshot_date)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_metrics_product_date ON market_metrics(product_mining_id, snapshot_date DESC);
-- RLS Policies
ALTER TABLE market_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON market_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM product_mining pm
            JOIN stores s ON s.id = pm.store_id
            WHERE pm.id = market_metrics.product_mining_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create metrics" ON market_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM product_mining pm
            JOIN stores s ON s.id = pm.store_id
            WHERE pm.id = market_metrics.product_mining_id
            AND s.user_id = auth.uid()
        )
    );


-- Variant Analysis Table
CREATE TABLE IF NOT EXISTS variant_analysis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_mining_id uuid NOT NULL REFERENCES product_mining(id) ON DELETE CASCADE,
    
    variant_name text NOT NULL, -- e.g., "Red / Large" or "128GB"
    review_count int DEFAULT 0,
    review_share numeric(5, 2) DEFAULT 0, -- Percentage of total reviews (e.g., 25.50)
    est_monthly_sales int DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(product_mining_id, variant_name)
);
-- RLS Policies
ALTER TABLE variant_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variant analysis" ON variant_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM product_mining pm
            JOIN stores s ON s.id = pm.store_id
            WHERE pm.id = variant_analysis.product_mining_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create variant analysis" ON variant_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM product_mining pm
            JOIN stores s ON s.id = pm.store_id
            WHERE pm.id = variant_analysis.product_mining_id
            AND s.user_id = auth.uid()
        )
    );


-- 11. Phase 13 & 14: Market Intelligence Tables

CREATE TABLE IF NOT EXISTS keyword_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_mining_id uuid REFERENCES product_mining(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  rank integer,
  search_volume_est integer DEFAULT 0,
  is_indexed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_keyword_target CHECK (product_id IS NOT NULL OR product_mining_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_keyword_tracking_product_id ON keyword_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_keyword_tracking_mining_id ON keyword_tracking(product_mining_id);
ALTER TABLE keyword_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own keyword tracking" ON keyword_tracking;
CREATE POLICY "Users can view own keyword tracking" ON keyword_tracking FOR SELECT TO authenticated USING (
  (product_id IS NOT NULL AND EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = keyword_tracking.product_id AND stores.user_id = auth.uid()))
  OR
  (product_mining_id IS NOT NULL AND EXISTS (SELECT 1 FROM product_mining JOIN stores ON stores.id = product_mining.store_id WHERE product_mining.id = keyword_tracking.product_mining_id AND stores.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can create keyword tracking" ON keyword_tracking;
CREATE POLICY "Users can create keyword tracking" ON keyword_tracking FOR INSERT TO authenticated WITH CHECK (
  (product_id IS NOT NULL AND EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = keyword_tracking.product_id AND stores.user_id = auth.uid()))
  OR
  (product_mining_id IS NOT NULL AND EXISTS (SELECT 1 FROM product_mining JOIN stores ON stores.id = product_mining.store_id WHERE product_mining.id = keyword_tracking.product_mining_id AND stores.user_id = auth.uid()))
);

CREATE TABLE IF NOT EXISTS market_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  opportunity_score numeric(3,1), -- 0.0 to 10.0
  difficulty_score numeric(3,1),
  metrics_json jsonb DEFAULT '{}'::jsonb,
  ai_insight text,
  -- Task 13.2: Volume & Seasonality
  est_monthly_sales integer DEFAULT 0,
  seasonality_forecast jsonb DEFAULT '[]'::jsonb,
  forecast_confidence integer DEFAULT 0,
  forecast_generated_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_opportunities_product_id ON market_opportunities(product_id);
ALTER TABLE market_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own market opportunities" ON market_opportunities;
CREATE POLICY "Users can view own market opportunities" ON market_opportunities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = market_opportunities.product_id AND stores.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create market opportunities" ON market_opportunities;
CREATE POLICY "Users can create market opportunities" ON market_opportunities FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id WHERE products.id = market_opportunities.product_id AND stores.user_id = auth.uid())
);

-- 12. Idempotent Column Additions (Run if table exists but column missing)

DO $pkg$
BEGIN
    -- product_mining.ai_analysis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_mining' AND column_name = 'ai_analysis') THEN
        ALTER TABLE product_mining ADD COLUMN ai_analysis JSONB DEFAULT NULL;
    END IF;

    -- notification_settings.stock_threshold
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_settings' AND column_name = 'stock_threshold') THEN
        ALTER TABLE notification_settings ADD COLUMN stock_threshold integer DEFAULT 10;
    END IF;

    -- market_opportunities.metrics_json (if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'metrics_json') THEN
        ALTER TABLE market_opportunities ADD COLUMN metrics_json jsonb DEFAULT '{}'::jsonb;
    END IF;
    
    -- market_opportunities.ai_insight
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'ai_insight') THEN
        ALTER TABLE market_opportunities ADD COLUMN ai_insight text;
    END IF;

    -- market_opportunities.est_monthly_sales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'est_monthly_sales') THEN
        ALTER TABLE market_opportunities ADD COLUMN est_monthly_sales integer DEFAULT 0;
    END IF;

    -- market_opportunities.seasonality_forecast
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'seasonality_forecast') THEN
        ALTER TABLE market_opportunities ADD COLUMN seasonality_forecast jsonb DEFAULT '[]'::jsonb;
    END IF;
    
    -- market_opportunities.forecast_confidence
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'forecast_confidence') THEN
        ALTER TABLE market_opportunities ADD COLUMN forecast_confidence integer DEFAULT 0;
    END IF;

    -- market_opportunities.forecast_generated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_opportunities' AND column_name = 'forecast_generated_at') THEN
        ALTER TABLE market_opportunities ADD COLUMN forecast_generated_at timestamptz;
    END IF;

END $pkg$;
