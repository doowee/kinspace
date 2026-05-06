-- Tighten RLS to address security findings

-- 1. profiles: restrict broad co-member SELECT to STAFF only (owner/instructor).
--    Students should not see other students' email/phone/injury notes/stripe ids.
DROP POLICY IF EXISTS "Co-members can view limited profile info" ON public.profiles;

CREATE POLICY "Staff can view co-member profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.studio_members sm_self
      JOIN public.studio_members sm_target ON sm_self.studio_id = sm_target.studio_id
      WHERE sm_self.user_id = auth.uid()
        AND sm_target.user_id = profiles.id
        AND sm_self.role IN ('owner'::studio_role, 'instructor'::studio_role)
    )
  );

-- "Users can view their own profile" policy already exists for self-access.

-- 2. transactions: restrict full SELECT to owners only.
--    Instructors don't need student transaction amounts/payment methods.
DROP POLICY IF EXISTS "Owners can view studio transactions" ON public.transactions;

CREATE POLICY "Owners can view studio transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- 3. lookup_user_id_by_email: restrict to users in studios owned by caller.
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller must be an owner of at least one studio, AND the looked-up user
  -- must already be a member of one of the caller's owned studios.
  SELECT p.id INTO _user_id
  FROM public.profiles p
  JOIN public.studio_members sm_target ON sm_target.user_id = p.id
  JOIN public.studio_members sm_caller ON sm_caller.studio_id = sm_target.studio_id
  WHERE p.email = lower(_email)
    AND sm_caller.user_id = auth.uid()
    AND sm_caller.role = 'owner'::studio_role
  LIMIT 1;

  RETURN _user_id;
END;
$function$;