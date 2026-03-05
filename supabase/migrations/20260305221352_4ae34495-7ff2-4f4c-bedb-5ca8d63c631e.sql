
CREATE OR REPLACE FUNCTION public.handle_class_booking(p_class_id uuid, p_studio_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _has_sub BOOLEAN := FALSE;
  _credits INTEGER;
  _capacity INTEGER;
  _confirmed INTEGER;
  _status booking_status;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check 1: Active subscription access
  SELECT TRUE INTO _has_sub
  FROM public.user_subscriptions us
  JOIN public.products p ON p.id = us.product_id
  WHERE us.user_id = _user_id
    AND us.status = 'active'
    AND (
      p.access_scope = 'all_studios'
      OR (p.access_scope = 'single_studio' AND us.studio_id = p_studio_id)
    )
  LIMIT 1;

  IF _has_sub THEN
    -- Authorized via subscription — no point deduction
    SELECT capacity_total INTO _capacity FROM classes WHERE id = p_class_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;

    SELECT COUNT(*) INTO _confirmed FROM bookings
    WHERE class_id = p_class_id AND status = 'confirmed';

    IF _confirmed >= _capacity THEN
      _status := 'waitlist'::booking_status;
    ELSE
      _status := 'confirmed'::booking_status;
    END IF;

    INSERT INTO bookings (user_id, class_id, studio_id, status)
    VALUES (_user_id, p_class_id, p_studio_id, _status);

    IF _status = 'waitlist' THEN
      RETURN 'Waitlisted — subscription access';
    ELSE
      RETURN 'Booked successfully';
    END IF;
  END IF;

  -- Check 2: Consumable class points
  SELECT class_points INTO _credits FROM profiles WHERE id = _user_id FOR UPDATE;
  IF _credits >= 1 THEN
    SELECT capacity_total INTO _capacity FROM classes WHERE id = p_class_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;

    SELECT COUNT(*) INTO _confirmed FROM bookings
    WHERE class_id = p_class_id AND status = 'confirmed';

    IF _confirmed >= _capacity THEN
      _status := 'waitlist'::booking_status;
    ELSE
      _status := 'confirmed'::booking_status;
    END IF;

    UPDATE profiles SET class_points = class_points - 1 WHERE id = _user_id;

    INSERT INTO bookings (user_id, class_id, studio_id, status)
    VALUES (_user_id, p_class_id, p_studio_id, _status);

    IF _status = 'waitlist' THEN
      RETURN 'Waitlisted — credit held';
    ELSE
      RETURN 'Booked successfully';
    END IF;
  END IF;

  -- Check 3: No access
  RAISE EXCEPTION 'INSUFFICIENT_ACCESS';
END;
$$;
