ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS description text;
DROP FUNCTION IF EXISTS public.get_public_classes_by_studio_slug(text);
CREATE FUNCTION public.get_public_classes_by_studio_slug(_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  start_time timestamptz,
  capacity integer,
  instructor_first_name text,
  instructor_last_name text,
  description text,
  instructor_bio text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.start_time, c.capacity,
         i.name AS instructor_first_name,
         ''::text AS instructor_last_name,
         c.description,
         i.bio AS instructor_bio
  FROM public.classes c
  JOIN public.studios s ON s.id = c.studio_id
  LEFT JOIN public.instructors i ON i.id = c.instructor_id
  WHERE s.slug = _slug
  ORDER BY c.start_time ASC;
$$;