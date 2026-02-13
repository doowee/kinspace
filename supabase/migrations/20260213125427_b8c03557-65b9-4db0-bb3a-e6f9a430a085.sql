
-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'waitlist');

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Studio staff can view all bookings for their studio
CREATE POLICY "Staff can view studio bookings"
ON public.bookings FOR SELECT
USING (is_studio_member(auth.uid(), studio_id));

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = user_id);

-- Staff can create bookings
CREATE POLICY "Staff can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

-- Users can book for themselves (for public booking page)
CREATE POLICY "Users can book for themselves"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Staff can update bookings
CREATE POLICY "Staff can update bookings"
ON public.bookings FOR UPDATE
USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

-- Users can cancel their own bookings
CREATE POLICY "Users can update own bookings"
ON public.bookings FOR UPDATE
USING (auth.uid() = user_id);

-- Only owners can delete bookings
CREATE POLICY "Owners can delete bookings"
ON public.bookings FOR DELETE
USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Index for common queries
CREATE INDEX idx_bookings_class_id ON public.bookings(class_id);
CREATE INDEX idx_bookings_studio_id ON public.bookings(studio_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
