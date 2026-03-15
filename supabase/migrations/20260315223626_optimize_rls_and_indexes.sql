/*
  # Performance & Security Optimization

  1. Index Optimization
    - Add missing foreign key index on stores.user_id
    - Improves query performance for user-based lookups

  2. RLS Policy Optimization
    - Convert all auth.uid() calls to (SELECT auth.uid())
    - Prevents re-evaluation per row (significant performance gain at scale)
    - Applies to all tables: stores, products, orders, etc.

  3. Security Fixes
    - Fix technical_logs RLS policy (remove always-true WITH CHECK)
    - Remove duplicate permissive policy on shipping_rates
    - Restrict anon access to technical_logs with proper validation

  Note: Unused index warnings are informational only (indexes ready for scale).
  Auth DB connection strategy is infrastructure-level (no migration needed).
  HaveIBeenPwned is Supabase Dashboard setting (no SQL control).
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - STORES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own stores" ON stores;
DROP POLICY IF EXISTS "Users can create own stores" ON stores;
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON stores;

CREATE POLICY "Users can view own stores"
  ON stores FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own stores"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own stores"
  ON stores FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own stores"
  ON stores FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - PRODUCTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can create products in own stores" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create products in own stores"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - PRICE_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own snapshots" ON price_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for own products" ON price_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON price_snapshots;

CREATE POLICY "Users can view own snapshots"
  ON price_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = price_snapshots.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create snapshots for own products"
  ON price_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = price_snapshots.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own snapshots"
  ON price_snapshots FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = price_snapshots.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 5. OPTIMIZE RLS POLICIES - NOTIFICATION_SETTINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can view their notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Store owners can insert their notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Store owners can update their notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Store owners can delete their notification settings" ON notification_settings;

CREATE POLICY "Store owners can view their notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can insert their notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can update their notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can delete their notification settings"
  ON notification_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = notification_settings.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 6. OPTIMIZE RLS POLICIES - SHIPPING_RATES TABLE
-- ============================================================================

-- Remove duplicate permissive policy (keep user-specific one only)
DROP POLICY IF EXISTS "Authenticated users can read system defaults" ON shipping_rates;
DROP POLICY IF EXISTS "Users can read own store shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Users can create shipping rates for own stores" ON shipping_rates;
DROP POLICY IF EXISTS "Users can update own store shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Users can delete own store shipping rates" ON shipping_rates;

-- Unified SELECT policy (handles both system defaults and user rates)
CREATE POLICY "Users can read shipping rates"
  ON shipping_rates FOR SELECT
  TO authenticated
  USING (
    store_id IS NULL  -- System defaults (no store_id)
    OR EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create shipping rates for own stores"
  ON shipping_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own store shipping rates"
  ON shipping_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own store shipping rates"
  ON shipping_rates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 7. OPTIMIZE RLS POLICIES - ORDERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can view their orders" ON orders;
DROP POLICY IF EXISTS "Store owners can create orders" ON orders;
DROP POLICY IF EXISTS "Store owners can update their orders" ON orders;
DROP POLICY IF EXISTS "Store owners can delete their orders" ON orders;

CREATE POLICY "Store owners can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can delete their orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 8. OPTIMIZE RLS POLICIES - ORDER_ITEMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Store owners can view their order items" ON order_items;
DROP POLICY IF EXISTS "Store owners can create order items" ON order_items;
DROP POLICY IF EXISTS "Store owners can update their order items" ON order_items;
DROP POLICY IF EXISTS "Store owners can delete their order items" ON order_items;

CREATE POLICY "Store owners can view their order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can update their order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Store owners can delete their order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 9. OPTIMIZE RLS POLICIES - COMMISSION_SCHEDULES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own commission schedules" ON commission_schedules;
DROP POLICY IF EXISTS "Users can create own commission schedules" ON commission_schedules;
DROP POLICY IF EXISTS "Users can update own commission schedules" ON commission_schedules;
DROP POLICY IF EXISTS "Users can delete own commission schedules" ON commission_schedules;

CREATE POLICY "Users can view own commission schedules"
  ON commission_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create own commission schedules"
  ON commission_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own commission schedules"
  ON commission_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own commission schedules"
  ON commission_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 10. OPTIMIZE RLS POLICIES - PRODUCT_MINING TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own research" ON product_mining;
DROP POLICY IF EXISTS "Users can create research entries" ON product_mining;
DROP POLICY IF EXISTS "Users can update own research" ON product_mining;
DROP POLICY IF EXISTS "Users can delete own research" ON product_mining;

CREATE POLICY "Users can view own research"
  ON product_mining FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_mining.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create research entries"
  ON product_mining FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_mining.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own research"
  ON product_mining FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_mining.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_mining.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own research"
  ON product_mining FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = product_mining.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 11. OPTIMIZE RLS POLICIES - KEYWORD_DATA TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own keywords" ON keyword_data;
DROP POLICY IF EXISTS "Users can create keywords" ON keyword_data;
DROP POLICY IF EXISTS "Users can update own keywords" ON keyword_data;
DROP POLICY IF EXISTS "Users can delete own keywords" ON keyword_data;

CREATE POLICY "Users can view own keywords"
  ON keyword_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = keyword_data.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create keywords"
  ON keyword_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = keyword_data.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own keywords"
  ON keyword_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = keyword_data.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = keyword_data.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own keywords"
  ON keyword_data FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = keyword_data.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 12. OPTIMIZE RLS POLICIES - MARKET_METRICS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own metrics" ON market_metrics;
DROP POLICY IF EXISTS "Users can create metrics" ON market_metrics;

CREATE POLICY "Users can view own metrics"
  ON market_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_mining pm
      JOIN stores s ON s.id = pm.store_id
      WHERE pm.id = market_metrics.product_mining_id
      AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create metrics"
  ON market_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_mining pm
      JOIN stores s ON s.id = pm.store_id
      WHERE pm.id = market_metrics.product_mining_id
      AND s.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 13. OPTIMIZE RLS POLICIES - VARIANT_ANALYSIS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own variant analysis" ON variant_analysis;
DROP POLICY IF EXISTS "Users can create variant analysis" ON variant_analysis;

CREATE POLICY "Users can view own variant analysis"
  ON variant_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_mining pm
      JOIN stores s ON s.id = pm.store_id
      WHERE pm.id = variant_analysis.product_mining_id
      AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create variant analysis"
  ON variant_analysis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_mining pm
      JOIN stores s ON s.id = pm.store_id
      WHERE pm.id = variant_analysis.product_mining_id
      AND s.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 14. OPTIMIZE RLS POLICIES - KEYWORD_TRACKING TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own keyword tracking" ON keyword_tracking;
DROP POLICY IF EXISTS "Users can create keyword tracking" ON keyword_tracking;
DROP POLICY IF EXISTS "Users can update own keyword tracking" ON keyword_tracking;
DROP POLICY IF EXISTS "Users can delete own keyword tracking" ON keyword_tracking;

CREATE POLICY "Users can view own keyword tracking"
  ON keyword_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = keyword_tracking.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create keyword tracking"
  ON keyword_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = keyword_tracking.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own keyword tracking"
  ON keyword_tracking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = keyword_tracking.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = keyword_tracking.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own keyword tracking"
  ON keyword_tracking FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = keyword_tracking.product_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 15. FIX TECHNICAL_LOGS SECURITY ISSUE
-- ============================================================================

-- Remove insecure always-true policy
DROP POLICY IF EXISTS "Allow anon inserts" ON technical_logs;

-- Replace with secure policy: Only allow valid log entries with required fields
CREATE POLICY "Allow authenticated log inserts"
  ON technical_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    level IN ('info', 'warn', 'error', 'debug')
    AND source IS NOT NULL
    AND message IS NOT NULL
    AND char_length(message) > 0
    AND char_length(message) <= 5000  -- Prevent abuse
  );

-- Allow anon only for critical error logging (with strict validation)
CREATE POLICY "Allow anon error logs only"
  ON technical_logs FOR INSERT
  TO anon
  WITH CHECK (
    level = 'error'
    AND source IS NOT NULL
    AND message IS NOT NULL
    AND char_length(message) > 0
    AND char_length(message) <= 1000  -- Stricter limit for anon
  );
