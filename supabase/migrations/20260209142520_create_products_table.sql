/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key, auto-generated)
      - `store_id` (uuid, references stores.id, NOT NULL)
      - `external_id` (text, marketplace product ID like "p-12345")
      - `name` (text, product name)
      - `buy_price` (numeric, purchase cost, NOT NULL)
      - `sales_price` (numeric, current selling price)
      - `competitor_price` (numeric, competitor's price)
      - `commission_rate` (numeric, marketplace commission, default 0.15)
      - `vat_rate` (integer, VAT percentage, default 20)
      - `desi` (numeric, volumetric weight, default 1.0)
      - `shipping_cost` (numeric, shipping cost, default 0)
      - `extra_cost` (numeric, operational extras, default 0)
      - `ad_cost` (numeric, advertising cost per sale, default 0)
      - `stock_status` (text, InStock/Low/OutOfStock)
      - `image_url` (text, product image)
      - `category` (text, product category)
      - `marketplace_url` (text, link to marketplace listing)
      - `last_scraped` (timestamptz, last scrape time)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `products` table
    - Users can only access products belonging to their stores
*/

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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create products in own stores"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );
