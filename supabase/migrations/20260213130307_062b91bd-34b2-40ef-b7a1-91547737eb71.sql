
DROP FUNCTION IF EXISTS public.get_public_classes_by_studio_slug(text);

CREATE FUNCTION public.get_public_classes_by_studio_slug(_slug text)
 RETURNS TABLE(id uuid, name text, start_time timestamp with time zone, capacity integer, instructor_first_name text, instructor_last_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name, c.start_time, c.capacity,
         p.first_name AS instructor_first_name,
         p.last_name AS instructor_last_name
  FROM public.classes c
  JOIN public.studios s ON s.id = c.studio_id
  LEFT JOIN public.profiles p ON p.id = c.instructor_id
  WHERE s.slug = _slug
  ORDER BY c.start_time ASC;
$function$;
