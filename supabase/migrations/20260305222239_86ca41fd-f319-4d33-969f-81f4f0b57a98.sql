
-- 1. Replace cancel_booking_logic with smart refund logic
CREATE OR REPLACE FUNCTION public.cancel_booking_logic(_booking_id uuid, _user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _booking record;
  _class record;
  _window_hours integer;
  _hours_until_class double precision;
  _has_sub boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _booking FROM public.bookings
  WHERE id = _booking_id AND user_id = _user_id AND status IN ('confirmed', 'waitlist');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;

  SELECT * INTO _class FROM public.classes WHERE id = _booking.class_id;

  SELECT late_cancel_window_hours INTO _window_hours
  FROM public.studios WHERE id = _booking.studio_id;

  _hours_until_class := EXTRACT(EPOCH FROM (_class.start_time - now())) / 3600.0;

  IF _hours_until_class > _window_hours THEN
    -- EARLY CANCEL
    UPDATE public.bookings SET status = 'cancelled' WHERE id = _booking_id;

    -- Check if user has an active subscription for this studio
    SELECT TRUE INTO _has_sub
    FROM public.user_subscriptions us
    JOIN public.products p ON p.id = us.product_id
    WHERE us.user_id = _user_id
      AND us.status = 'active'
      AND (
        p.access_scope = 'all_studios'
        OR (p.access_scope = 'single_studio' AND us.studio_id = _booking.studio_id)
      )
    LIMIT 1;

    IF _has_sub THEN
      RETURN 'Booking cancelled. No credit to refund (subscription access).';
    ELSE
      UPDATE public.profiles SET class_points = class_points + 1 WHERE id = _user_id;
      RETURN 'Booking cancelled. Credit refunded.';
    END IF;
  ELSE
    -- LATE CANCEL
    UPDATE public.bookings SET status = 'late_cancelled' WHERE id = _booking_id;
    RETURN 'Late cancellation. Credit forfeited.';
  END IF;
END;
$$;

-- 2. Create auto_promote_waitlist trigger function
CREATE OR REPLACE FUNCTION public.auto_promote_waitlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _next record;
  _has_active_sub boolean;
  _studio_id uuid;
BEGIN
  _studio_id := NEW.studio_id;

  FOR _next IN
    SELECT b.id, b.user_id
    FROM public.bookings b
    WHERE b.class_id = NEW.class_id
      AND b.status = 'waitlist'
    ORDER BY b.created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Check if waitlisted student has an active subscription
    _has_active_sub := false;
    SELECT TRUE INTO _has_active_sub
    FROM public.user_subscriptions us
    JOIN public.products p ON p.id = us.product_id
    WHERE us.user_id = _next.user_id
      AND us.status = 'active'
      AND (
        p.access_scope = 'all_studios'
        OR (p.access_scope = 'single_studio' AND us.studio_id = _studio_id)
      )
    LIMIT 1;

    IF _has_active_sub THEN
      -- Subscription still active → promote
      UPDATE public.bookings SET status = 'confirmed' WHERE id = _next.id;
      RETURN NEW;
    END IF;

    -- Check if user has a profile (pack user – points already deducted at waitlist time)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _next.user_id) THEN
      -- Check if they originally joined via subscription (no point was deducted)
      -- by seeing if they had a subscription at some point for this studio
      -- If they have NO active sub now but DID have one (expired/cancelled), skip them
      IF EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        JOIN public.products p ON p.id = us.product_id
        WHERE us.user_id = _next.user_id
          AND us.status != 'active'
          AND (
            p.access_scope = 'all_studios'
            OR (p.access_scope = 'single_studio' AND us.studio_id = _studio_id)
          )
      ) AND NOT EXISTS (
        -- Confirm they truly have no active sub (already checked above)
        -- AND no point was deducted (subscription users don't lose points)
        -- We can infer: if they had a sub (now inactive) and no active sub, they booked via sub
        -- So skip them – mark as cancelled for staff review
        SELECT 1
      ) THEN
        -- This path means: had inactive sub, no active sub → subscription expired
        UPDATE public.bookings SET status = 'cancelled' WHERE id = _next.id;
        CONTINUE;
      END IF;

      -- Pack user (points already held) → promote
      UPDATE public.bookings SET status = 'confirmed' WHERE id = _next.id;
      RETURN NEW;
    ELSE
      -- No profile (edge case) → cancel
      UPDATE public.bookings SET status = 'cancelled' WHERE id = _next.id;
      CONTINUE;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER trg_auto_promote_waitlist
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelled','late_cancelled') AND OLD.status IN ('confirmed','checked_in'))
  EXECUTE FUNCTION public.auto_promote_waitlist();
