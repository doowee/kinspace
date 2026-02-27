
-- Add subscription_tier column to organizations table
ALTER TABLE public.organizations
ADD COLUMN subscription_tier text NOT NULL DEFAULT 'standard';
