
-- Add branding columns to studios table
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS primary_color text;

-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.get_public_studio_by_slug(text);

CREATE FUNCTION public.get_public_studio_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, location text, logo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.name, s.slug, s.location, s.logo_url
  FROM public.studios s
  WHERE s.slug = _slug
  LIMIT 1;
$function$;
