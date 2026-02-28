
-- Fix the view to use security_invoker = true (not definer)
DROP VIEW IF EXISTS public.studios_public;

CREATE VIEW public.studios_public
WITH (security_invoker = true) AS
SELECT id, name, slug, location, logo_url, 
       brand_primary, brand_secondary, brand_highlight, 
       brand_text, brand_background, primary_color,
       currency, timezone, late_cancel_window_hours, late_cancel_fee,
       subscription_tier, owner_id, organization_id
FROM public.studios;

GRANT SELECT ON public.studios_public TO anon, authenticated;

-- The base table policy "Studio members can view full studio details" was already created.
-- But the view needs to work for anon users too (public booking pages).
-- We need a policy that allows anon to read only through the view.
-- Since security_invoker = true, the anon role needs a SELECT policy on studios.
-- Create a limited policy for anon that only exposes non-sensitive data:
-- Actually, with security_invoker views, the querying user's permissions apply.
-- So anon needs a SELECT policy on the base table for the view to work.
-- Let's add a policy that allows anon SELECT but the view already restricts columns.

CREATE POLICY "Anon can view studios for public pages"
ON public.studios FOR SELECT
TO anon
USING (true);
