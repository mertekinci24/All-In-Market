/*
  # Create shipping_rates table - Dynamic Kargo Barem System

  1. New Tables
    - `shipping_rates`
      - `id` (uuid, primary key)
      - `store_id` (uuid, nullable - NULL means system default, non-null means store override)
      - `marketplace` (text, e.g. 'trendyol', 'hepsiburada', 'amazon_tr')
      - `rate_type` (text, 'desi' for desi-based or 'price' for price-based barem)
      - `min_value` (numeric, lower bound of the range - desi value or price in TL)
      - `max_value` (numeric, upper bound of the range - desi value or price in TL)
      - `cost` (numeric, shipping cost in TL, KDV included)
      - `vat_included` (boolean, whether cost includes VAT, default true)
      - `is_active` (boolean, whether this rate is active, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Design Decisions
    - store_id NULL = system defaults (admin-managed, available to all users)
    - store_id NOT NULL = user-specific overrides for their store
    - rate_type 'desi' = shipping cost based on volumetric weight ranges
    - rate_type 'price' = shipping cost based on product sale price ranges
    - When both rate types exist, desi-based takes priority (marketplace standard)
    - cost stored as KDV-included (Turkish marketplace standard)
    - Unique constraint on (store_id, marketplace, rate_type, min_value) prevents duplicates

  3. Security
    - Enable RLS on `shipping_rates` table
    - All authenticated users can read system defaults (store_id IS NULL)
    - Users can only read/write their own store's custom rates
*/

CREATE TABLE IF NOT EXISTS shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  marketplace text NOT NULL DEFAULT 'trendyol',
  rate_type text NOT NULL DEFAULT 'desi',
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  vat_included boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT shipping_rates_rate_type_check CHECK (rate_type IN ('desi', 'price')),
  CONSTRAINT shipping_rates_unique_range UNIQUE NULLS NOT DISTINCT (store_id, marketplace, rate_type, min_value)
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_store_id ON shipping_rates(store_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_marketplace ON shipping_rates(marketplace);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_lookup ON shipping_rates(store_id, marketplace, rate_type, is_active);

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read system defaults
CREATE POLICY "Authenticated users can read system defaults"
  ON shipping_rates FOR SELECT
  TO authenticated
  USING (store_id IS NULL);

-- Users can read their own store's custom rates
CREATE POLICY "Users can read own store shipping rates"
  ON shipping_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Users can create custom rates for their own stores
CREATE POLICY "Users can create shipping rates for own stores"
  ON shipping_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Users can update their own store's custom rates
CREATE POLICY "Users can update own store shipping rates"
  ON shipping_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Users can delete their own store's custom rates
CREATE POLICY "Users can delete own store shipping rates"
  ON shipping_rates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = shipping_rates.store_id
      AND stores.user_id = auth.uid()
    )
  );
