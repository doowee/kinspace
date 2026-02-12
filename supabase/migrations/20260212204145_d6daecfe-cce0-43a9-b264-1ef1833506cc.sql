
-- Public function to get studio info by slug (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_studio_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, location text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.slug, s.location
  FROM public.studios s
  WHERE s.slug = _slug
  LIMIT 1;
$$;

-- Public function to get classes for a studio by slug (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_classes_by_studio_slug(_slug text)
RETURNS TABLE(id uuid, name text, start_time timestamptz, capacity int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.start_time, c.capacity
  FROM public.classes c
  JOIN public.studios s ON s.id = c.studio_id
  WHERE s.slug = _slug
  ORDER BY c.start_time ASC;
$$;
