DO $$
BEGIN
  INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
  VALUES ('Jordan Lee', 'Former dancer specializing in barre fusion and core conditioning.', 2, '5678', '11111111-1111-1111-1111-111111111111', true);
  
  INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
  VALUES ('Priya Sharma', 'Mindful movement coach blending Pilates with breathwork and yoga.', 3, '9012', '11111111-1111-1111-1111-111111111111', true);
  
  INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
  VALUES ('Marco Rivera', 'Former professional dancer turned movement specialist.', 4, '2468', '11111111-1111-1111-1111-111111111111', true);
END;
$$;