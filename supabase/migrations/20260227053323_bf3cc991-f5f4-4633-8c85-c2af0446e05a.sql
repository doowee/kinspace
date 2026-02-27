
-- Add home_studio_id to instructors for "main studio" flag
ALTER TABLE public.instructors
  ADD COLUMN IF NOT EXISTS home_studio_id uuid REFERENCES public.studios(id) DEFAULT NULL;
