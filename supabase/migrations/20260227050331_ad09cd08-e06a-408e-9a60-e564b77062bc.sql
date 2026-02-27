
-- Add billing columns to studios (append-only, not dropping from organizations)
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'standard';

-- Copy existing org-level values to studios where applicable
UPDATE public.studios s
SET stripe_account_id = o.stripe_account_id,
    subscription_tier = o.subscription_tier
FROM public.organizations o
WHERE s.organization_id = o.id
  AND (o.stripe_account_id IS NOT NULL OR o.subscription_tier != 'standard');
