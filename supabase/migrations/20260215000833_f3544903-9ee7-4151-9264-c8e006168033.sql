DROP FUNCTION public.get_public_studio_by_slug(text);

CREATE FUNCTION public.get_public_studio_by_slug(_slug text)
 RETURNS TABLE(id uuid, name text, slug text, location text, logo_url text, brand_primary text, brand_secondary text, brand_highlight text, brand_text text, brand_background text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.name, s.slug, s.location, s.logo_url, s.brand_primary, s.brand_secondary, s.brand_highlight, s.brand_text, s.brand_background
  FROM public.studios s
  WHERE s.slug = _slug
  LIMIT 1;
$function$;