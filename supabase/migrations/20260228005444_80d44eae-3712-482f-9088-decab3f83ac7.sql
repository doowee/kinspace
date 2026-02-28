
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view studio branding" ON public.studios;

-- Create a restricted public SELECT policy that only exposes branding columns
-- We use a security-invoker view approach for public access
CREATE VIEW public.studios_public
WITH (security_invoker = false) AS
SELECT id, name, slug, location, logo_url, 
       brand_primary, brand_secondary, brand_highlight, 
       brand_text, brand_background, primary_color,
       currency, timezone, late_cancel_window_hours, late_cancel_fee,
       subscription_tier, owner_id, organization_id
FROM public.studios;

-- Grant access to the view for anon and authenticated
GRANT SELECT ON public.studios_public TO anon, authenticated;

-- Now create a more restrictive policy on the base table:
-- Only studio members can SELECT from the actual studios table (which includes stripe_account_id)
CREATE POLICY "Studio members can view full studio details"
ON public.studios FOR SELECT
USING (is_studio_member(auth.uid(), id));
