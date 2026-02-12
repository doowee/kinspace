-- Grant table permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Anon needs no access (all operations require auth)
GRANT SELECT ON public.studios TO anon;
GRANT SELECT ON public.studio_members TO anon;
GRANT SELECT ON public.classes TO anon;
GRANT SELECT ON public.profiles TO anon;