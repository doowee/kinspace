
-- Phase 1: Add SmartCover routing columns

-- Instructors: authorized studios (array of studio UUIDs) and certified class types
ALTER TABLE public.instructors
  ADD COLUMN IF NOT EXISTS authorized_studios uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certified_class_types text[] DEFAULT '{}';

-- Classes: class type (e.g. 'reformer', 'mat', 'jumpboard')
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS class_type text DEFAULT NULL;

-- Index for efficient array containment queries used by SmartCover routing
CREATE INDEX IF NOT EXISTS idx_instructors_authorized_studios ON public.instructors USING GIN (authorized_studios);
CREATE INDEX IF NOT EXISTS idx_instructors_certified_class_types ON public.instructors USING GIN (certified_class_types);
