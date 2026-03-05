CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _studio_id uuid;
BEGIN
  _studio_id := NULLIF(NEW.raw_user_meta_data->>'studio_id', '')::uuid;

  INSERT INTO public.profiles (id, email, first_name, last_name, phone, home_studio_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN _studio_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.studios WHERE id = _studio_id)
         THEN _studio_id ELSE NULL END
  );

  IF _studio_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.studios WHERE id = _studio_id) THEN
    INSERT INTO public.studio_members (user_id, studio_id, role)
    VALUES (NEW.id, _studio_id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;