/*
  # Create order_items table

  1. New Tables
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, FK → orders, NOT NULL, ON DELETE CASCADE)
      - `product_id` (uuid, FK → products, ON DELETE SET NULL) — nullable so item survives product deletion
      - `product_name` (text) — Denormalized snapshot of product name at sale time
      - `quantity` (integer, default 1)
      - `unit_price` (numeric, default 0) — Sale price per unit at time of order
      - `buy_price_at_sale` (numeric, default 0) — Buy cost snapshot
      - `commission_rate_at_sale` (numeric, default 0) — Resolved commission rate (0-1) at sale time
      - `vat_rate_at_sale` (numeric, default 20) — VAT rate snapshot
      - `shipping_share` (numeric, default 0) — This item's proportional share of total cart shipping
      - `extra_cost` (numeric, default 0) — Per-unit extra costs
      - `ad_cost` (numeric, default 0) — Per-unit ad costs
      - `net_profit` (numeric, default 0) — Pre-calculated profit for this line item

  2. Security
    - Enable RLS on `order_items` table
    - 4 restrictive policies: SELECT/INSERT/UPDATE/DELETE
    - All policies verify store ownership via orders → stores.user_id = auth.uid() join

  3. Indexes
    - order_id for fast item lookups per order
    - product_id for product-based queries
*/

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
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
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
      AND stores.user_id = auth.uid()
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
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
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
      AND stores.user_id = auth.uid()
    )
  );
