
-- 1. Add cancellation policy columns to studios
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS late_cancel_window_hours integer NOT NULL DEFAULT 12,
ADD COLUMN IF NOT EXISTS late_cancel_fee numeric;

-- 2. Add 'late_cancelled' to the booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'late_cancelled';

-- 3. Create the cancel_booking_logic function
CREATE OR REPLACE FUNCTION public.cancel_booking_logic(_booking_id uuid, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _booking record;
  _class record;
  _studio record;
  _hours_until_class double precision;
  _pass record;
BEGIN
  -- Verify the caller is the booking owner
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Fetch the booking
  SELECT * INTO _booking FROM public.bookings
  WHERE id = _booking_id AND user_id = _user_id AND status IN ('confirmed', 'waitlist');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;

  -- Fetch the class
  SELECT * INTO _class FROM public.classes WHERE id = _booking.class_id;

  -- Fetch studio cancellation policy
  SELECT late_cancel_window_hours INTO _studio FROM public.studios WHERE id = _booking.studio_id;

  -- Calculate hours until class
  _hours_until_class := EXTRACT(EPOCH FROM (_class.start_time - now())) / 3600.0;

  IF _hours_until_class > _studio.late_cancel_window_hours THEN
    -- EARLY CANCEL: refund credit
    UPDATE public.bookings SET status = 'cancelled' WHERE id = _booking_id;

    -- Refund to the earliest-expiring active pass
    SELECT id INTO _pass FROM public.student_passes
    WHERE user_id = _user_id
      AND studio_id = _booking.studio_id
      AND expires_at > now()
    ORDER BY expires_at ASC
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.student_passes
      SET credits_remaining = credits_remaining + 1
      WHERE id = _pass.id;
    END IF;

    RETURN 'Booking cancelled. Credit refunded.';
  ELSE
    -- LATE CANCEL: burn the credit
    UPDATE public.bookings SET status = 'late_cancelled' WHERE id = _booking_id;

    RETURN 'Late cancellation. Credit forfeited.';
  END IF;
END;
$function$;
