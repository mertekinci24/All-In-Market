/*
  # Add is_active column to products table

  This column tracks whether a product is actively being monitored.
  Used in v1.5.1 to prevent zombie product tracking.

  1. Changes
    - Add `is_active` boolean column with default true
    - Products are active by default when created

  2. Impact
    - Existing products will be marked as active
    - Extension can filter inactive products from tracking
*/

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

COMMENT ON COLUMN public.products.is_active IS 'Whether product is actively being tracked (prevents zombie snapshots)';

-- Update existing products to be active
UPDATE public.products SET is_active = true WHERE is_active IS NULL;
