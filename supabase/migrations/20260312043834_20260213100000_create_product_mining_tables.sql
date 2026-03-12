-- -----------------------------------------------------------------------------
-- Migration: Create Product Mining & Intelligence Tables (Phase 10)
-- -----------------------------------------------------------------------------
-- This migration establishes the data infrastructure for the "Deep Research" module.
-- It introduces 4 new tables to separate "Research Data" from "Active Inventory".

-- 1. product_mining: Stores potential products found via extension/research.
-- 2. keyword_data: Tracks keyword volume, CPC, and opportunity scores.
-- 3. market_metrics: Time-series snapshots of BSR, Price, and Reviews.
-- 4. variant_analysis: Estimated sales distribution per product variant.

-- Features:
-- - RLS enabled on all tables (User-scoped access).
-- - ON DELETE CASCADE for clean data removal.
-- - Optimized indexes for dashboard queries.

-- =============================================================================
-- 1. Table: product_mining
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_mining (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    marketplace text NOT NULL,
    asin text NOT NULL,
    title text NOT NULL,
    image_url text,
    current_price numeric,
    opportunity_score numeric DEFAULT 0,
    notes text DEFAULT '',
    is_tracked boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(store_id, marketplace, asin)
);

CREATE INDEX IF NOT EXISTS idx_product_mining_store_id ON public.product_mining(store_id);
CREATE INDEX IF NOT EXISTS idx_product_mining_opportunity ON public.product_mining(opportunity_score DESC);

ALTER TABLE public.product_mining ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own research" ON public.product_mining
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = product_mining.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create research entries" ON public.product_mining
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = product_mining.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own research" ON public.product_mining
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = product_mining.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own research" ON public.product_mining
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = product_mining.store_id 
            AND stores.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 2. Table: keyword_data
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.keyword_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    search_volume int DEFAULT 0,
    cpc numeric DEFAULT 0,
    difficulty int DEFAULT 0,
    opportunity_score int DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(store_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_data_store_volume ON public.keyword_data(store_id, search_volume DESC);

ALTER TABLE public.keyword_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keywords" ON public.keyword_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = keyword_data.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create keywords" ON public.keyword_data
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = keyword_data.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own keywords" ON public.keyword_data
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = keyword_data.store_id 
            AND stores.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own keywords" ON public.keyword_data
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = keyword_data.store_id 
            AND stores.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 3. Table: market_metrics
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.market_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_mining_id uuid NOT NULL REFERENCES public.product_mining(id) ON DELETE CASCADE,
    snapshot_date date DEFAULT CURRENT_DATE,
    
    bsr int,
    review_count int,
    rating numeric(3, 2),
    price numeric,
    est_monthly_sales int,
    
    created_at timestamptz DEFAULT now(),
    
    UNIQUE(product_mining_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_market_metrics_product_date ON public.market_metrics(product_mining_id, snapshot_date DESC);

ALTER TABLE public.market_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics" ON public.market_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product_mining pm
            JOIN public.stores s ON s.id = pm.store_id
            WHERE pm.id = market_metrics.product_mining_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create metrics" ON public.market_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.product_mining pm
            JOIN public.stores s ON s.id = pm.store_id
            WHERE pm.id = market_metrics.product_mining_id
            AND s.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 4. Table: variant_analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.variant_analysis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_mining_id uuid NOT NULL REFERENCES public.product_mining(id) ON DELETE CASCADE,
    
    variant_name text NOT NULL,
    review_count int DEFAULT 0,
    review_share numeric(5, 2) DEFAULT 0,
    est_monthly_sales int DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(product_mining_id, variant_name)
);

ALTER TABLE public.variant_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variant analysis" ON public.variant_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product_mining pm
            JOIN public.stores s ON s.id = pm.store_id
            WHERE pm.id = variant_analysis.product_mining_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create variant analysis" ON public.variant_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.product_mining pm
            JOIN public.stores s ON s.id = pm.store_id
            WHERE pm.id = variant_analysis.product_mining_id
            AND s.user_id = auth.uid()
        )
    );
