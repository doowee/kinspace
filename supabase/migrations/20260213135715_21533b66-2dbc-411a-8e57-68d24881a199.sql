
-- Step 1: Null out existing instructor_id values (they reference profiles)
UPDATE public.classes SET instructor_id = NULL WHERE instructor_id IS NOT NULL;

-- Step 2: Drop old FK to profiles
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_instructor_id_fkey;

-- Step 3: Create instructors table
CREATE TABLE public.instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Step 5: Public read access
CREATE POLICY "Anyone can view instructors"
  ON public.instructors FOR SELECT
  USING (true);

-- Step 6: Owner CRUD
CREATE POLICY "Owners can create instructors"
  ON public.instructors FOR INSERT
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can update instructors"
  ON public.instructors FOR UPDATE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can delete instructors"
  ON public.instructors FOR DELETE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Step 7: Add new FK from classes.instructor_id to instructors
ALTER TABLE public.classes
  ADD CONSTRAINT classes_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES public.instructors(id) ON DELETE SET NULL;

-- Step 8: Update the public classes RPC
CREATE OR REPLACE FUNCTION public.get_public_classes_by_studio_slug(_slug text)
 RETURNS TABLE(id uuid, name text, start_time timestamp with time zone, capacity integer, instructor_first_name text, instructor_last_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name, c.start_time, c.capacity,
         i.name AS instructor_first_name,
         ''::text AS instructor_last_name
  FROM public.classes c
  JOIN public.studios s ON s.id = c.studio_id
  LEFT JOIN public.instructors i ON i.id = c.instructor_id
  WHERE s.slug = _slug
  ORDER BY c.start_time ASC;
$function$;
