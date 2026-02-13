
-- 1. Add user_id column to instructors
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Allow instructors to update their own profile
CREATE POLICY "Instructors can update own profile"
ON public.instructors
FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Allow owners to link user_id (already covered by existing "Owners can update instructors" policy)
