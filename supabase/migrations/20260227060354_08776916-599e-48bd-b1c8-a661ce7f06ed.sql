
-- Update create_studio_with_membership to auto-create an organization
CREATE OR REPLACE FUNCTION public.create_studio_with_membership(_name text, _slug text, _location text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
  _studio_id uuid;
  _org_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the organization first
  INSERT INTO public.organizations (name, owner_id)
  VALUES (_name, _user_id)
  RETURNING id INTO _org_id;

  -- Create the studio linked to the org
  INSERT INTO public.studios (name, slug, owner_id, location, organization_id)
  VALUES (_name, _slug, _user_id, _location, _org_id)
  RETURNING id INTO _studio_id;

  -- Create owner membership
  INSERT INTO public.studio_members (user_id, studio_id, role)
  VALUES (_user_id, _studio_id, 'owner');

  -- Link the user's profile to the org
  UPDATE public.profiles
  SET organization_id = _org_id
  WHERE id = _user_id;

  RETURN _studio_id;
END;
$function$;
