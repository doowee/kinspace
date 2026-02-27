
-- Add master Stripe subscription ID to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
