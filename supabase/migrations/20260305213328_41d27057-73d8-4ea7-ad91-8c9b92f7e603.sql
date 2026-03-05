
CREATE OR REPLACE FUNCTION public.book_class_with_credit(p_class_id UUID, p_studio_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _credits INTEGER;
  _capacity INTEGER;
  _confirmed INTEGER;
  _status booking_status;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock profile row and check credits
  SELECT class_points INTO _credits FROM profiles WHERE id = _user_id FOR UPDATE;
  IF _credits < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Lock class row and check capacity
  SELECT capacity_total INTO _capacity FROM classes WHERE id = p_class_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  SELECT COUNT(*) INTO _confirmed FROM bookings
  WHERE class_id = p_class_id AND status = 'confirmed';

  IF _confirmed >= _capacity THEN
    _status := 'waitlist'::booking_status;
  ELSE
    _status := 'confirmed'::booking_status;
  END IF;

  -- Deduct credit
  UPDATE profiles SET class_points = class_points - 1 WHERE id = _user_id;

  -- Create booking
  INSERT INTO bookings (user_id, class_id, studio_id, status)
  VALUES (_user_id, p_class_id, p_studio_id, _status);

  IF _status = 'waitlist' THEN
    RETURN 'Waitlisted — credit held';
  ELSE
    RETURN 'Booked successfully';
  END IF;
END;
$$;
