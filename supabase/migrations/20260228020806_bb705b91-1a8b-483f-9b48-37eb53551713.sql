-- Tighten studios SELECT policy: change from public to authenticated role
DROP POLICY IF EXISTS "Studio members can view full studio details" ON public.studios;
CREATE POLICY "Studio members can view full studio details"
  ON public.studios FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), id));

-- Tighten profiles INSERT policy: change from public to authenticated role
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);