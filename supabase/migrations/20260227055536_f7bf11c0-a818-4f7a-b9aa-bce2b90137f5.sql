
-- Create cover_requests table to track SmartCover sub requests and escalation
CREATE TABLE public.cover_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  requesting_instructor_id uuid NOT NULL REFERENCES public.instructors(id),
  studio_id uuid NOT NULL REFERENCES public.studios(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'escalated', 'covered', 'cancelled', 'manual_override')),
  eligible_count integer NOT NULL DEFAULT 0,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cover_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Instructors can view own cover requests"
  ON public.cover_requests FOR SELECT
  USING (
    requesting_instructor_id IN (
      SELECT id FROM public.instructors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create cover requests"
  ON public.cover_requests FOR INSERT
  WITH CHECK (
    requesting_instructor_id IN (
      SELECT id FROM public.instructors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view studio cover requests"
  ON public.cover_requests FOR SELECT
  USING (
    get_studio_role(auth.uid(), studio_id) IN ('owner', 'admin', 'instructor')
  );

CREATE POLICY "Owners can update cover requests"
  ON public.cover_requests FOR UPDATE
  USING (
    get_studio_role(auth.uid(), studio_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners can delete cover requests"
  ON public.cover_requests FOR DELETE
  USING (
    get_studio_role(auth.uid(), studio_id) = 'owner'
  );

-- Trigger for updated_at
CREATE TRIGGER update_cover_requests_updated_at
  BEFORE UPDATE ON public.cover_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_cover_requests_class_id ON public.cover_requests(class_id);
CREATE INDEX idx_cover_requests_studio_status ON public.cover_requests(studio_id, status);
