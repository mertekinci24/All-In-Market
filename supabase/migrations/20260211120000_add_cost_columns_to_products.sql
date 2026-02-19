-- Migration: Add advanced cost columns to products table
-- Task 6.5 — Gelişmiş Gider Katmanları

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS packaging_cost       numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS packaging_vat_included boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS return_rate           numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS logistics_type        text DEFAULT 'standard' NOT NULL,
  ADD COLUMN IF NOT EXISTS service_fee           numeric DEFAULT 0 NOT NULL;

-- Add constraint: return_rate between 0 and 100
ALTER TABLE products
  ADD CONSTRAINT chk_return_rate CHECK (return_rate >= 0 AND return_rate <= 100);

-- Add constraint: logistics_type valid values
ALTER TABLE products
  ADD CONSTRAINT chk_logistics_type CHECK (logistics_type IN ('standard', 'fba', 'easy_ship'));

-- Add constraint: packaging_cost and service_fee non-negative
ALTER TABLE products
  ADD CONSTRAINT chk_packaging_cost CHECK (packaging_cost >= 0),
  ADD CONSTRAINT chk_service_fee CHECK (service_fee >= 0);

COMMENT ON COLUMN products.packaging_cost IS 'Total packaging cost per unit (TL)';
COMMENT ON COLUMN products.packaging_vat_included IS 'Whether packaging cost includes VAT';
COMMENT ON COLUMN products.return_rate IS 'Expected return percentage (0-100)';
COMMENT ON COLUMN products.logistics_type IS 'Logistics type: standard, fba, easy_ship';
COMMENT ON COLUMN products.service_fee IS 'Marketplace service fee per order (TL)';
