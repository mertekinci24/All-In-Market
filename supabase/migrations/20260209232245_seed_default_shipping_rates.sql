/*
  # Seed Default Shipping Rates (System Defaults)

  1. Data Seeded
    - Trendyol Desi-based rates (8 tiers: 0-1 through 20-30)
    - Trendyol Price-based rates (4 tiers: 0-50, 50-100, 100-150, 150+)
    - Hepsiburada Desi-based rates (8 tiers)
    - Hepsiburada Price-based rates (4 tiers)
    - Amazon TR Desi-based rates (8 tiers)
    - Amazon TR Price-based rates (4 tiers)

  2. Important Notes
    - store_id is NULL for all rows (system defaults)
    - All costs are KDV-included (vat_included = true)
    - Price-based rate with cost = 0 means free shipping for that range
    - These serve as fallback rates when users haven't set custom rates
    - Users can override these by creating store-specific rates
*/

-- Trendyol Desi-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'trendyol', 'desi', 0, 1, 9.99, true),
  (NULL, 'trendyol', 'desi', 1, 2, 11.99, true),
  (NULL, 'trendyol', 'desi', 2, 3, 13.99, true),
  (NULL, 'trendyol', 'desi', 3, 5, 17.99, true),
  (NULL, 'trendyol', 'desi', 5, 10, 24.99, true),
  (NULL, 'trendyol', 'desi', 10, 15, 34.99, true),
  (NULL, 'trendyol', 'desi', 15, 20, 44.99, true),
  (NULL, 'trendyol', 'desi', 20, 30, 59.99, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;

-- Trendyol Price-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'trendyol', 'price', 0, 50, 14.99, true),
  (NULL, 'trendyol', 'price', 50, 100, 11.99, true),
  (NULL, 'trendyol', 'price', 100, 150, 8.99, true),
  (NULL, 'trendyol', 'price', 150, 999999, 0, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;

-- Hepsiburada Desi-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'hepsiburada', 'desi', 0, 1, 10.99, true),
  (NULL, 'hepsiburada', 'desi', 1, 2, 12.99, true),
  (NULL, 'hepsiburada', 'desi', 2, 3, 14.99, true),
  (NULL, 'hepsiburada', 'desi', 3, 5, 18.99, true),
  (NULL, 'hepsiburada', 'desi', 5, 10, 26.99, true),
  (NULL, 'hepsiburada', 'desi', 10, 15, 36.99, true),
  (NULL, 'hepsiburada', 'desi', 15, 20, 46.99, true),
  (NULL, 'hepsiburada', 'desi', 20, 30, 62.99, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;

-- Hepsiburada Price-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'hepsiburada', 'price', 0, 50, 15.99, true),
  (NULL, 'hepsiburada', 'price', 50, 100, 12.99, true),
  (NULL, 'hepsiburada', 'price', 100, 150, 9.99, true),
  (NULL, 'hepsiburada', 'price', 150, 999999, 0, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;

-- Amazon TR Desi-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'amazon_tr', 'desi', 0, 1, 11.99, true),
  (NULL, 'amazon_tr', 'desi', 1, 2, 13.99, true),
  (NULL, 'amazon_tr', 'desi', 2, 3, 15.99, true),
  (NULL, 'amazon_tr', 'desi', 3, 5, 19.99, true),
  (NULL, 'amazon_tr', 'desi', 5, 10, 27.99, true),
  (NULL, 'amazon_tr', 'desi', 10, 15, 37.99, true),
  (NULL, 'amazon_tr', 'desi', 15, 20, 49.99, true),
  (NULL, 'amazon_tr', 'desi', 20, 30, 64.99, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;

-- Amazon TR Price-based defaults
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  (NULL, 'amazon_tr', 'price', 0, 50, 16.99, true),
  (NULL, 'amazon_tr', 'price', 50, 100, 13.99, true),
  (NULL, 'amazon_tr', 'price', 100, 200, 9.99, true),
  (NULL, 'amazon_tr', 'price', 200, 999999, 0, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;
