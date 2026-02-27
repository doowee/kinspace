INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
SELECT 'Jordan Lee', 'Former dancer specializing in barre fusion and core conditioning. Brings energy and precision to every class.', 2, '5678', '11111111-1111-1111-1111-111111111111'::uuid, true
WHERE NOT EXISTS (SELECT 1 FROM public.instructors WHERE name = 'Jordan Lee' AND studio_id = '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
SELECT 'Priya Sharma', 'Mindful movement coach blending Pilates with breathwork and yoga. Certified in pre-natal Pilates and therapeutic exercise.', 3, '9012', '11111111-1111-1111-1111-111111111111'::uuid, true
WHERE NOT EXISTS (SELECT 1 FROM public.instructors WHERE name = 'Priya Sharma' AND studio_id = '11111111-1111-1111-1111-111111111111'::uuid);

INSERT INTO public.instructors (name, bio, display_order, pin_code, studio_id, is_active)
SELECT 'Marco Rivera', 'Former professional dancer turned movement specialist. Expert in barre and contemporary techniques with 10 years of teaching experience.', 4, '2468', '11111111-1111-1111-1111-111111111111'::uuid, true
WHERE NOT EXISTS (SELECT 1 FROM public.instructors WHERE name = 'Marco Rivera' AND studio_id = '11111111-1111-1111-1111-111111111111'::uuid);