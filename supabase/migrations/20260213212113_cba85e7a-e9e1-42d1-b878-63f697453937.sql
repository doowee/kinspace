
-- 1. Add organization_id column to instructors
ALTER TABLE public.instructors
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 2. Populate organization_id from the linked studio
UPDATE public.instructors i
SET organization_id = s.organization_id
FROM public.studios s
WHERE s.id = i.studio_id;

-- 3. Make studio_id nullable (no longer required)
ALTER TABLE public.instructors
ALTER COLUMN studio_id DROP NOT NULL;

-- 4. Drop old RLS policies that reference studio_id
DROP POLICY IF EXISTS "Anyone can view instructors" ON public.instructors;
DROP POLICY IF EXISTS "Owners can create instructors" ON public.instructors;
DROP POLICY IF EXISTS "Owners can update instructors" ON public.instructors;
DROP POLICY IF EXISTS "Owners can delete instructors" ON public.instructors;
DROP POLICY IF EXISTS "Instructors can update own profile" ON public.instructors;

-- 5. Helper: check if user is org member (already exists, reuse it)
-- We need a helper to check org ownership for instructors
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = 'owner'
  );
$$;

-- 6. New RLS policies scoped to organization
CREATE POLICY "Anyone can view instructors"
ON public.instructors FOR SELECT
USING (true);

CREATE POLICY "Org owners can create instructors"
ON public.instructors FOR INSERT
WITH CHECK (
  is_org_owner(auth.uid(), organization_id)
  OR (studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner')
);

CREATE POLICY "Org owners can update instructors"
ON public.instructors FOR UPDATE
USING (
  is_org_owner(auth.uid(), organization_id)
  OR (studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner')
  OR (auth.uid() = user_id)
);

CREATE POLICY "Org owners can delete instructors"
ON public.instructors FOR DELETE
USING (
  is_org_owner(auth.uid(), organization_id)
  OR (studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner')
);
