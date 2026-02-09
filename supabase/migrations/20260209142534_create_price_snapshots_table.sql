/*
  # Create price snapshots table

  1. New Tables
    - `price_snapshots`
      - `id` (uuid, primary key, auto-generated)
      - `product_id` (uuid, references products.id, NOT NULL)
      - `sales_price` (numeric, selling price at snapshot time)
      - `competitor_price` (numeric, competitor price at snapshot time)
      - `buy_price` (numeric, purchase cost at snapshot time)
      - `net_profit` (numeric, calculated net profit)
      - `snapshot_date` (timestamptz, when snapshot was taken)

  2. Security
    - Enable RLS on `price_snapshots` table
    - Users can only access snapshots of their own products

  3. Important Notes
    - This table stores historical price data for trend analysis
    - Used to power profit trend charts and price history views
*/

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

CREATE POLICY "Users can view own snapshots"
  ON price_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON stores.id = products.store_id
      WHERE products.id = price_snapshots.product_id
      AND stores.user_id = auth.uid()
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
      AND stores.user_id = auth.uid()
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
      AND stores.user_id = auth.uid()
    )
  );
