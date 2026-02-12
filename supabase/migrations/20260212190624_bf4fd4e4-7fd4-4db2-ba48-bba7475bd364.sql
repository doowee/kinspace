
-- Drop and recreate studios INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can create studios" ON public.studios;
CREATE POLICY "Authenticated users can create studios"
ON public.studios FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Drop and recreate studios SELECT policy as PERMISSIVE
DROP POLICY IF EXISTS "Members can view their studios" ON public.studios;
CREATE POLICY "Members can view their studios"
ON public.studios FOR SELECT
TO authenticated
USING (is_studio_member(auth.uid(), id));

-- Drop and recreate studios UPDATE policy as PERMISSIVE
DROP POLICY IF EXISTS "Owners can update their studios" ON public.studios;
CREATE POLICY "Owners can update their studios"
ON public.studios FOR UPDATE
TO authenticated
USING (get_studio_role(auth.uid(), id) = 'owner'::studio_role);

-- Drop and recreate studios DELETE policy as PERMISSIVE
DROP POLICY IF EXISTS "Owners can delete their studios" ON public.studios;
CREATE POLICY "Owners can delete their studios"
ON public.studios FOR DELETE
TO authenticated
USING (get_studio_role(auth.uid(), id) = 'owner'::studio_role);

-- Drop and recreate studio_members INSERT policy as PERMISSIVE
DROP POLICY IF EXISTS "Owners can manage members" ON public.studio_members;
CREATE POLICY "Owners can manage members"
ON public.studio_members FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) OR (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role));

-- Drop and recreate studio_members SELECT policy as PERMISSIVE
DROP POLICY IF EXISTS "Members can view other members in their studios" ON public.studio_members;
CREATE POLICY "Members can view other members in their studios"
ON public.studio_members FOR SELECT
TO authenticated
USING (is_studio_member(auth.uid(), studio_id));

-- Drop and recreate studio_members UPDATE policy as PERMISSIVE
DROP POLICY IF EXISTS "Owners can update members" ON public.studio_members;
CREATE POLICY "Owners can update members"
ON public.studio_members FOR UPDATE
TO authenticated
USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Drop and recreate studio_members DELETE policy as PERMISSIVE
DROP POLICY IF EXISTS "Owners can remove members" ON public.studio_members;
CREATE POLICY "Owners can remove members"
ON public.studio_members FOR DELETE
TO authenticated
USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Drop and recreate classes policies as PERMISSIVE
DROP POLICY IF EXISTS "Members can view classes in their studios" ON public.classes;
CREATE POLICY "Members can view classes in their studios"
ON public.classes FOR SELECT
TO authenticated
USING (is_studio_member(auth.uid(), studio_id));

DROP POLICY IF EXISTS "Owners and instructors can create classes" ON public.classes;
CREATE POLICY "Owners and instructors can create classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

DROP POLICY IF EXISTS "Owners and instructors can update classes" ON public.classes;
CREATE POLICY "Owners and instructors can update classes"
ON public.classes FOR UPDATE
TO authenticated
USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

DROP POLICY IF EXISTS "Owners can delete classes" ON public.classes;
CREATE POLICY "Owners can delete classes"
ON public.classes FOR DELETE
TO authenticated
USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Drop and recreate profiles policies as PERMISSIVE
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of studio co-members" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR (EXISTS (
  SELECT 1 FROM studio_members sm1
  JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
  WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.id
)));
