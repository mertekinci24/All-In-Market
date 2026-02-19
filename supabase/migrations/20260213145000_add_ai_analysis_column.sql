-- Add ai_analysis column to product_mining table
ALTER TABLE public.product_mining 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN public.product_mining.ai_analysis IS 'Stores AI-generated analysis including sentiment, themes, and summary';
