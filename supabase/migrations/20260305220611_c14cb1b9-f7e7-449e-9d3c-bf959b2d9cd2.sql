ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR;