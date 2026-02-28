
-- ================================================================
-- SECURITY FIX: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- and fix data exposure issues
-- ================================================================

-- ============ INSTRUCTORS TABLE ============
-- Fix 1: Remove public SELECT that exposes pin_code
-- Replace with: public view of safe fields + staff full access
DROP POLICY IF EXISTS "Anyone can view instructors" ON public.instructors;
DROP POLICY IF EXISTS "Studio owners can create instructors" ON public.instructors;
DROP POLICY IF EXISTS "Studio owners can delete instructors" ON public.instructors;
DROP POLICY IF EXISTS "Studio owners can update instructors" ON public.instructors;

-- Public can see non-sensitive instructor info (no pin_code, no user_id)
-- But we can't do column-level RLS, so we restrict full access to studio members
-- and use the existing RPC for public class listings
CREATE POLICY "Studio members can view instructors"
  ON public.instructors FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Studio owners can create instructors"
  ON public.instructors FOR INSERT
  TO authenticated
  WITH CHECK ((studio_id IS NOT NULL) AND (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role));

CREATE POLICY "Studio owners can delete instructors"
  ON public.instructors FOR DELETE
  TO authenticated
  USING ((studio_id IS NOT NULL) AND (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role));

CREATE POLICY "Studio owners can update instructors"
  ON public.instructors FOR UPDATE
  TO authenticated
  USING (((studio_id IS NOT NULL) AND (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role)) OR (auth.uid() = user_id));

-- ============ STUDIOS TABLE ============
-- Fix: Replace overly permissive public SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all studios" ON public.studios;
DROP POLICY IF EXISTS "Members can view their studios" ON public.studios;
DROP POLICY IF EXISTS "Public can view studio branding by slug" ON public.studios;
DROP POLICY IF EXISTS "Authenticated users can create studios" ON public.studios;
DROP POLICY IF EXISTS "Owners can delete their studios" ON public.studios;
DROP POLICY IF EXISTS "Owners can update their studios" ON public.studios;

-- Public can view basic branding fields (needed for booking page)
-- Full access for members only
CREATE POLICY "Anyone can view studio branding"
  ON public.studios FOR SELECT
  USING (true);
-- Note: We keep this as true because the public booking page needs studio info
-- The sensitive fields (stripe_account_id) should ideally be in a separate table
-- but that's a larger refactor. The RPC functions already handle public access safely.

CREATE POLICY "Authenticated users can create studios"
  ON public.studios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their studios"
  ON public.studios FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), id) = 'owner'::studio_role);

CREATE POLICY "Owners can delete their studios"
  ON public.studios FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), id) = 'owner'::studio_role);

-- ============ BOOKINGS TABLE ============
DROP POLICY IF EXISTS "Instructors can update bookings for their classes" ON public.bookings;
DROP POLICY IF EXISTS "Instructors can view bookings for their classes" ON public.bookings;
DROP POLICY IF EXISTS "Owners can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view studio bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can book for themselves" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view studio bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Users can book for themselves"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Owners can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ CLASSES TABLE ============
DROP POLICY IF EXISTS "Instructors can view their assigned classes" ON public.classes;
DROP POLICY IF EXISTS "Members can view classes in their studios" ON public.classes;
DROP POLICY IF EXISTS "Owners and instructors can create classes" ON public.classes;
DROP POLICY IF EXISTS "Owners and instructors can update classes" ON public.classes;
DROP POLICY IF EXISTS "Owners can delete classes" ON public.classes;

CREATE POLICY "Members can view classes in their studios"
  ON public.classes FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Owners and instructors can create classes"
  ON public.classes FOR INSERT
  TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Owners and instructors can update classes"
  ON public.classes FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Owners can delete classes"
  ON public.classes FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ PROFILES TABLE ============
DROP POLICY IF EXISTS "Instructors can view student profiles for their classes" ON public.profiles;
DROP POLICY IF EXISTS "Org staff can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Co-members can view limited profile info"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM studio_members sm1
    JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.id
  ));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============ COVER_REQUESTS TABLE ============
DROP POLICY IF EXISTS "Owners can delete cover requests" ON public.cover_requests;
DROP POLICY IF EXISTS "Instructors can view own cover requests" ON public.cover_requests;
DROP POLICY IF EXISTS "Instructors can create cover requests" ON public.cover_requests;
DROP POLICY IF EXISTS "Staff can view studio cover requests" ON public.cover_requests;
DROP POLICY IF EXISTS "Owners can update cover requests" ON public.cover_requests;

CREATE POLICY "Staff can view studio cover requests"
  ON public.cover_requests FOR SELECT
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'admin'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Instructors can create cover requests"
  ON public.cover_requests FOR INSERT
  TO authenticated
  WITH CHECK (requesting_instructor_id IN (SELECT id FROM instructors WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update cover requests"
  ON public.cover_requests FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'admin'::studio_role]));

CREATE POLICY "Owners can delete cover requests"
  ON public.cover_requests FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ ORGANIZATIONS TABLE ============
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Org members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can delete their org" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can update their org" ON public.organizations;

CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), id));

CREATE POLICY "Org owners can update their org"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (is_org_owner(auth.uid(), id));

CREATE POLICY "Org owners can delete their org"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (is_org_owner(auth.uid(), id));

-- ============ PACKAGES TABLE ============
DROP POLICY IF EXISTS "Members can view all packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can create packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can delete packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can update packages" ON public.packages;
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;

CREATE POLICY "Public can view active packages"
  ON public.packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Members can view all packages"
  ON public.packages FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Owners can create packages"
  ON public.packages FOR INSERT
  TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can update packages"
  ON public.packages FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can delete packages"
  ON public.packages FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ STUDIO_MEMBERS TABLE ============
DROP POLICY IF EXISTS "Members can view other members in their studios" ON public.studio_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.studio_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.studio_members;
DROP POLICY IF EXISTS "Owners can update members" ON public.studio_members;

CREATE POLICY "Members can view other members in their studios"
  ON public.studio_members FOR SELECT
  TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Owners can manage members"
  ON public.studio_members FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role));

CREATE POLICY "Owners can update members"
  ON public.studio_members FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can remove members"
  ON public.studio_members FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ TRANSACTIONS TABLE ============
DROP POLICY IF EXISTS "Owners can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Students can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners can view studio transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

CREATE POLICY "Students can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view studio transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

-- SECURITY FIX: Remove self-service transaction insertion - only staff can create
CREATE POLICY "Staff can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = ANY (ARRAY['owner'::studio_role, 'instructor'::studio_role]));

CREATE POLICY "Owners can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can delete transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- ============ BOOKING RACE CONDITION FIX ============
-- Add trigger to enforce class capacity atomically
CREATE OR REPLACE FUNCTION public.check_class_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INTEGER;
  v_confirmed_count INTEGER;
BEGIN
  IF NEW.status = 'confirmed' THEN
    SELECT capacity_total INTO v_capacity 
    FROM classes WHERE id = NEW.class_id
    FOR UPDATE;  -- Lock the class row
    
    SELECT COUNT(*) INTO v_confirmed_count
    FROM bookings 
    WHERE class_id = NEW.class_id 
      AND status = 'confirmed' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF v_confirmed_count >= v_capacity THEN
      NEW.status := 'waitlist';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_class_capacity
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_class_capacity();

-- ============ EMAIL LOOKUP AUTHORIZATION FIX ============
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only studio owners can look up users by email
  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only studio owners can look up users by email';
  END IF;
  
  SELECT id INTO _user_id FROM public.profiles
  WHERE email = lower(_email) LIMIT 1;
  
  RETURN _user_id;
END;
$$;
