/*
  # Add Rich Product Data Support

  ## Overview
  Extends the products table to store comprehensive data extracted from Trendyol,
  including seller details, reviews, variants, specifications, and competitive intelligence.

  ## Changes

  ### 1. New Columns in `products` table
  - `content_id` - Trendyol product ID (for API calls)
  - `seller_id` - Seller/merchant ID
  - `brand_name` - Product brand
  - `rating` - Average customer rating (1-5)
  - `review_count` - Total number of reviews
  - `rich_data` - JSONB column storing all extended data:
    - Pricing details (discount%, campaign info)
    - Seller details (rating, followers, badges)
    - Stock & availability (quantity, delivery time)
    - Review breakdown (5★-1★ distribution)
    - Top reviews (sample of customer feedback)
    - Media (all images, video URLs)
    - Variants (sizes, colors, options)
    - Specifications (technical details)
    - Shipping info (free shipping thresholds)
    - Engagement metrics (favorites, questions)
    - Competition data (similar products, bundles)

  ### 2. Indexes
  - `content_id` for fast Trendyol product lookups
  - `seller_id` for seller-based queries
  - `brand_name` for brand filtering
  - `rating` for quality sorting
  - GIN index on `rich_data` for JSONB queries

  ## Notes
  - JSONB provides flexibility for evolving data structures
  - Rich data is optional (null if not scraped yet)
  - All existing products remain unaffected
*/

-- Add new columns to products table
DO $$
BEGIN
  -- Content ID (Trendyol product ID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'content_id'
  ) THEN
    ALTER TABLE products ADD COLUMN content_id text;
    CREATE INDEX IF NOT EXISTS idx_products_content_id ON products(content_id);
  END IF;

  -- Seller ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_id text;
    CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
  END IF;

  -- Brand Name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand_name'
  ) THEN
    ALTER TABLE products ADD COLUMN brand_name text;
    CREATE INDEX IF NOT EXISTS idx_products_brand_name ON products(brand_name);
  END IF;

  -- Rating
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'rating'
  ) THEN
    ALTER TABLE products ADD COLUMN rating numeric(3,2);
    CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);
  END IF;

  -- Review Count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE products ADD COLUMN review_count integer DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_products_review_count ON products(review_count);
  END IF;

  -- Rich Data (JSONB) - stores all extended information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'rich_data'
  ) THEN
    ALTER TABLE products ADD COLUMN rich_data jsonb;
    CREATE INDEX IF NOT EXISTS idx_products_rich_data ON products USING gin(rich_data);
  END IF;
END $$;
