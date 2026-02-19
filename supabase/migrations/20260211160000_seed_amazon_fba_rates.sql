/*
  # Seed Amazon TR FBA Rates (2026)
  
  Inserts FBA fulfillment rates into shipping_rates with rate_type = 'fba'.
  These are used when a product's logistics_type is set to 'fba'.
  
  FBA Total = Pick & Pack Fee + (Volume_dm3 × Storage Fee)
  
  Categories:
    1. Küçük Zarf      : < 80g  / < 1cm   → 28.50 TL + 3.20 TL/dm³
    2. Standart Zarf   : < 460g / < 2.5cm → 34.20 TL + 3.20 TL/dm³
    3. Standart (Küçük): < 960g / < 20cm  → 48.90 TL + 4.50 TL/dm³
    4. Standart (Büyük): < 12kg / < 45cm  → 72.40 TL + 4.50 TL/kg (base) 
    5. Oversize        : > 12kg / > 45cm  → 145.00 TL + 8.20 TL/kg (base)
  
  Weight ranges encoded as min_value/max_value (in grams for desi-like matching).
  The 'cost' column stores the base pick & pack fee.
*/

-- Amazon TR FBA Rates (rate_type = 'fba')
INSERT INTO shipping_rates (store_id, marketplace, rate_type, min_value, max_value, cost, vat_included)
VALUES
  -- Küçük Zarf: 0-80g
  (NULL, 'amazon_tr', 'fba', 0, 0.08, 28.50, true),
  -- Standart Zarf: 80-460g
  (NULL, 'amazon_tr', 'fba', 0.08, 0.46, 34.20, true),
  -- Standart Paket (Küçük): 460-960g
  (NULL, 'amazon_tr', 'fba', 0.46, 0.96, 48.90, true),
  -- Standart Paket (Büyük): 960g-12kg
  (NULL, 'amazon_tr', 'fba', 0.96, 12, 72.40, true),
  -- Oversize: 12kg+
  (NULL, 'amazon_tr', 'fba', 12, 999, 145.00, true)
ON CONFLICT (store_id, marketplace, rate_type, min_value) DO NOTHING;
