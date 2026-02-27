-- Add is_active column to instructors for soft-delete support
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;