
CREATE OR REPLACE FUNCTION public.cancel_booking_logic(_booking_id uuid, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking record;
  _class record;
  _studio record;
  _hours_until_class double precision;
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

    -- Refund credit to profile
    UPDATE public.profiles SET class_points = class_points + 1 WHERE id = _user_id;

    RETURN 'Booking cancelled. Credit refunded.';
  ELSE
    -- LATE CANCEL: burn the credit
    UPDATE public.bookings SET status = 'late_cancelled' WHERE id = _booking_id;

    RETURN 'Late cancellation. Credit forfeited.';
  END IF;
END;
$$;
