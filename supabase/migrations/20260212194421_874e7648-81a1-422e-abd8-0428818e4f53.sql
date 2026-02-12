-- Create a SECURITY DEFINER function to atomically create a studio + membership
CREATE OR REPLACE FUNCTION public.create_studio_with_membership(
  _name text,
  _slug text,
  _location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _studio_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.studios (name, slug, owner_id, location)
  VALUES (_name, _slug, _user_id, _location)
  RETURNING id INTO _studio_id;

  INSERT INTO public.studio_members (user_id, studio_id, role)
  VALUES (_user_id, _studio_id, 'owner');

  RETURN _studio_id;
END;
$$;