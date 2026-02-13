
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS brand_primary text DEFAULT '#374151';
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS brand_secondary text DEFAULT '#F3D2C1';
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS brand_highlight text DEFAULT '#F0FDF4';

-- Update the public RPC to include brand colors
DROP FUNCTION IF EXISTS public.get_public_studio_by_slug(text);
CREATE FUNCTION public.get_public_studio_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, location text, logo_url text, brand_primary text, brand_secondary text, brand_highlight text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.slug, s.location, s.logo_url, s.brand_primary, s.brand_secondary, s.brand_highlight
  FROM public.studios s
  WHERE s.slug = _slug
  LIMIT 1;
$$;
