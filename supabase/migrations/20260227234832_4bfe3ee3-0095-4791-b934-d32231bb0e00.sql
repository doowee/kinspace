-- Insert the 3 missing canonical instructors (bypasses RLS as migration)
INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active, user_id)
VALUES
  ('Jordan Lee', 'Former dancer specializing in barre fusion and core conditioning. Brings energy and precision to every class.', 2, '5678', '11111111-1111-1111-1111-111111111111', true, NULL),
  ('Priya Sharma', 'Mindful movement coach blending Pilates with breathwork and yoga. Certified in pre-natal Pilates and therapeutic exercise.', 3, '9012', '11111111-1111-1111-1111-111111111111', true, NULL),
  ('Marco Rivera', 'Former professional dancer turned movement specialist. Expert in barre and contemporary techniques with 10 years of teaching experience.', 4, '2468', '11111111-1111-1111-1111-111111111111', true, NULL)
ON CONFLICT DO NOTHING;