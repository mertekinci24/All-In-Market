/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `store_id` (uuid, FK → stores, NOT NULL, ON DELETE CASCADE)
      - `order_number` (text) — Marketplace order number (e.g., "TY-123456")
      - `marketplace_order_id` (text) — External marketplace ID
      - `order_date` (timestamptz) — When the order was placed
      - `total_amount` (numeric, default 0) — Total cart value
      - `total_shipping` (numeric, default 0) — Barem-resolved shipping for entire cart
      - `total_commission` (numeric, default 0) — Sum of commission across all items
      - `total_profit` (numeric, default 0) — Calculated net profit for entire order
      - `campaign_name` (text) — Active campaign at time of order
      - `campaign_seller_share` (numeric, default 0) — Seller's share of discount (0-1)
      - `campaign_marketplace_share` (numeric, default 0) — Marketplace's share of discount (0-1)
      - `status` (text, default 'pending') — pending/shipped/delivered/returned/cancelled
      - `notes` (text) — Optional user notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `orders` table
    - 4 restrictive policies: SELECT/INSERT/UPDATE/DELETE
    - All policies verify store ownership via stores.user_id = auth.uid()

  3. Indexes
    - store_id for fast store filtering
    - order_date for date range queries
    - status for status tab filtering
*/

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
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update their orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can delete their orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );
