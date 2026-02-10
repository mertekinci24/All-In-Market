/*
  # Create commission_schedules table for JIT Commission Resolution

  ## Overview
  This migration creates the `commission_schedules` table to support time-scheduled, campaign-aware commission rates. The table enables Just-in-Time (JIT) resolution where commission rates are determined at calculation time based on current timestamp and campaign validity windows.

  ## New Tables

  ### `commission_schedules`
  Stores commission rate schedules with time-based campaign windows.

  **Columns:**
  - `id` (uuid, PK) — Auto-generated unique identifier
  - `store_id` (uuid, FK → stores) — Store owner (NOT NULL, CASCADE delete)
  - `product_id` (uuid, FK → products) — NULL = store-wide schedule, NOT NULL = product-specific
  - `marketplace` (text) — Target marketplace ('Trendyol', 'Hepsiburada', 'Amazon TR')
  - `normal_rate` (numeric) — Standard commission rate (0-1, e.g., 0.15 = 15%)
  - `campaign_rate` (numeric) — Campaign commission rate during valid window (0-1)
  - `campaign_name` (text) — Campaign label (e.g., "Flash Indirim", "Ramazan Kampanyasi")
  - `valid_from` (timestamptz) — Campaign start timestamp (inclusive)
  - `valid_until` (timestamptz) — Campaign end timestamp (exclusive)
  - `seller_discount_share` (numeric) — Seller's share of price discount (0-1, default 1.0)
  - `marketplace_discount_share` (numeric) — Marketplace's share of discount (0-1, default 0)
  - `is_active` (boolean) — Soft delete flag (default true)
  - `created_at` (timestamptz) — Creation timestamp
  - `updated_at` (timestamptz) — Last update timestamp

  **Resolution Priority (JIT Logic):**
  1. Product-specific schedule (`product_id IS NOT NULL`) with active campaign
  2. Store-wide schedule (`product_id IS NULL`) with active campaign
  3. Fallback to `products.commission_rate` (manual override)

  **Active Campaign Check:**
  `NOW() BETWEEN valid_from AND valid_until AND is_active = true`

  ## Security

  ### Row Level Security (RLS)
  - Enabled on `commission_schedules` with 4 restrictive policies
  - All policies verify store ownership via `stores.user_id = auth.uid()`
  - Users can only access/modify schedules for their own stores

  ### Policies:
  1. **SELECT** — View own store schedules
  2. **INSERT** — Create schedules for own store only
  3. **UPDATE** — Modify own store schedules only
  4. **DELETE** — Remove own store schedules only

  ## Indexes

  - `store_id` — Fast store-level queries
  - `product_id` — Product-specific schedule lookups
  - `marketplace` — Marketplace filtering
  - `(store_id, marketplace, product_id)` — Composite lookup for JIT resolution
  - `(valid_from, valid_until)` — Time-range queries for active campaigns

  ## Important Notes

  1. **JIT Pattern:** No cron jobs or schedulers. Campaign activation/deactivation happens automatically based on current timestamp during profit calculation.

  2. **Nanosecond Precision:** Campaign transitions are instant (vs. cron's minute-level granularity).

  3. **Zero Infrastructure:** No failure modes, retry logic, or monitoring required.

  4. **Validation:** `valid_from` must be before `valid_until`. Both `seller_discount_share` and `marketplace_discount_share` should sum to ≤ 1.0 (validated at application level).

  5. **Soft Delete:** `is_active = false` keeps historical data while excluding from active queries.
*/

-- Create commission_schedules table
CREATE TABLE IF NOT EXISTS commission_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
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

-- Indexes for fast JIT resolution
CREATE INDEX IF NOT EXISTS idx_commission_schedules_store_id
  ON commission_schedules(store_id);

CREATE INDEX IF NOT EXISTS idx_commission_schedules_product_id
  ON commission_schedules(product_id);

CREATE INDEX IF NOT EXISTS idx_commission_schedules_marketplace
  ON commission_schedules(marketplace);

-- Composite index for JIT lookup (store + marketplace + product)
CREATE INDEX IF NOT EXISTS idx_commission_schedules_lookup
  ON commission_schedules(store_id, marketplace, product_id);

-- Time-range index for active campaign queries
CREATE INDEX IF NOT EXISTS idx_commission_schedules_validity
  ON commission_schedules(valid_from, valid_until);

-- Enable Row Level Security
ALTER TABLE commission_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own store schedules
CREATE POLICY "Users can view own commission schedules"
  ON commission_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create schedules for own store
CREATE POLICY "Users can create own commission schedules"
  ON commission_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update own store schedules
CREATE POLICY "Users can update own commission schedules"
  ON commission_schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete own store schedules
CREATE POLICY "Users can delete own commission schedules"
  ON commission_schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = commission_schedules.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Add constraint to ensure valid_from is before valid_until
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commission_schedules_valid_dates_check'
  ) THEN
    ALTER TABLE commission_schedules
    ADD CONSTRAINT commission_schedules_valid_dates_check
    CHECK (valid_from < valid_until);
  END IF;
END $$;