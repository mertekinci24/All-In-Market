/*
  # Create Keyword Tracking Table

  This table tracks keyword rankings for products over time.
  Used by the SERP parser to monitor search engine result positions.

  1. New Tables
    - `keyword_tracking`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `keyword` (text)
      - `rank` (integer)
      - `is_indexed` (boolean)
      - `search_volume_est` (integer)
      - `searched_at` (timestamptz)

  2. Security
    - Enable RLS on `keyword_tracking` table
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS public.keyword_tracking (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    rank integer,
    is_indexed boolean DEFAULT false,
    search_volume_est integer DEFAULT 0,
    searched_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    
    UNIQUE(product_id, keyword)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_keyword_tracking_product ON public.keyword_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_keyword_tracking_keyword ON public.keyword_tracking(keyword);

-- Enable RLS
ALTER TABLE public.keyword_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view keyword tracking for their products
CREATE POLICY "Users can view own keyword tracking" ON public.keyword_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.stores s ON s.id = p.store_id
            WHERE p.id = keyword_tracking.product_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can create keyword tracking entries
CREATE POLICY "Users can create keyword tracking" ON public.keyword_tracking
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.stores s ON s.id = p.store_id
            WHERE p.id = keyword_tracking.product_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can update their keyword tracking
CREATE POLICY "Users can update own keyword tracking" ON public.keyword_tracking
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.stores s ON s.id = p.store_id
            WHERE p.id = keyword_tracking.product_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can delete their keyword tracking
CREATE POLICY "Users can delete own keyword tracking" ON public.keyword_tracking
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.stores s ON s.id = p.store_id
            WHERE p.id = keyword_tracking.product_id
            AND s.user_id = auth.uid()
        )
    );
