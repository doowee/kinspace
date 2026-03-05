
CREATE OR REPLACE FUNCTION public.increment_class_points(_user_id UUID, _amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles SET class_points = class_points + _amount WHERE id = _user_id;
END;
$$;
