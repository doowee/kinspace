
-- Prevent duplicate bookings: one active booking per user per class
-- First remove any existing duplicates (keep earliest)
DELETE FROM public.bookings b1
USING public.bookings b2
WHERE b1.user_id = b2.user_id
  AND b1.class_id = b2.class_id
  AND b1.status IN ('confirmed', 'waitlist')
  AND b2.status IN ('confirmed', 'waitlist')
  AND b1.created_at > b2.created_at;

-- Add unique index for active bookings (confirmed/waitlist only)
CREATE UNIQUE INDEX idx_unique_active_booking
ON public.bookings (user_id, class_id)
WHERE status IN ('confirmed', 'waitlist');
