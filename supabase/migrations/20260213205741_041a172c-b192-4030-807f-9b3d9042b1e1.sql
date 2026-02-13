
-- Add brand_text column to studios
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS brand_text text DEFAULT '#FFFFFF';

-- Drop and recreate function with updated return type
DROP FUNCTION IF EXISTS public.get_public_studio_by_slug(text);

CREATE FUNCTION public.get_public_studio_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, location text, logo_url text, brand_primary text, brand_secondary text, brand_highlight text, brand_text text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.name, s.slug, s.location, s.logo_url, s.brand_primary, s.brand_secondary, s.brand_highlight, s.brand_text
  FROM public.studios s
  WHERE s.slug = _slug
  LIMIT 1;
$function$;

-- Allow anon users to SELECT studio branding for public pages
CREATE POLICY "Public can view studio branding by slug"
ON public.studios
FOR SELECT
TO anon
USING (true);
