
-- 1. Drop ALL org-referencing policies
DROP POLICY IF EXISTS "Org owners can create instructors" ON public.instructors;
DROP POLICY IF EXISTS "Org owners can update instructors" ON public.instructors;
DROP POLICY IF EXISTS "Org owners can delete instructors" ON public.instructors;
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can update org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can remove org members" ON public.organization_members;

-- 2. Drop passes/packages policies
DROP POLICY IF EXISTS "Staff can view studio passes" ON public.student_passes;
DROP POLICY IF EXISTS "Students can view own passes" ON public.student_passes;
DROP POLICY IF EXISTS "Owners can create passes" ON public.student_passes;
DROP POLICY IF EXISTS "Owners can update passes" ON public.student_passes;
DROP POLICY IF EXISTS "Owners can delete passes" ON public.student_passes;
DROP POLICY IF EXISTS "Users can purchase passes for themselves" ON public.student_passes;
DROP POLICY IF EXISTS "Users can update own passes" ON public.student_passes;
DROP POLICY IF EXISTS "Members can view studio packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can create packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can update packages" ON public.packages;
DROP POLICY IF EXISTS "Owners can delete packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;

-- 3. Drop org functions
DROP FUNCTION IF EXISTS public.create_org_with_membership(_name text, _slug text);
DROP FUNCTION IF EXISTS public.is_org_member(_user_id uuid, _org_id uuid);
DROP FUNCTION IF EXISTS public.is_org_owner(_user_id uuid, _org_id uuid);
DROP FUNCTION IF EXISTS public.get_org_role(_user_id uuid, _org_id uuid);
DROP FUNCTION IF EXISTS public.get_org_students(_org_id uuid);

-- 4. Drop FK columns FIRST (removes FK constraints)
ALTER TABLE public.studios DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.instructors DROP COLUMN IF EXISTS organization_id;

-- 5. Now safe to drop tables
DROP TABLE IF EXISTS public.student_passes;
DROP TABLE IF EXISTS public.packages;
DROP TABLE IF EXISTS public.organization_members;
DROP TABLE IF EXISTS public.organizations;

-- 6. Add new columns to studios
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- 7. Expand studio_role enum
ALTER TYPE public.studio_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.studio_role ADD VALUE IF NOT EXISTS 'front_desk';

-- 8. Add is_active to studio_members
ALTER TABLE public.studio_members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 9. Add client columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_studio_id uuid REFERENCES public.studios(id),
  ADD COLUMN IF NOT EXISTS membership_tier text DEFAULT 'Drop-in',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS class_points integer NOT NULL DEFAULT 0;

-- 10. Add capacity_booked and rename capacity
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS capacity_booked integer NOT NULL DEFAULT 0;
ALTER TABLE public.classes RENAME COLUMN capacity TO capacity_total;

-- 11. Add booking_source to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'web';

-- 12. Add type to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'class_pack';

-- 13. Replace instructor policies
CREATE POLICY "Studio owners can create instructors"
  ON public.instructors FOR INSERT
  WITH CHECK (studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Studio owners can update instructors"
  ON public.instructors FOR UPDATE
  USING ((studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role) OR (auth.uid() = user_id));

CREATE POLICY "Studio owners can delete instructors"
  ON public.instructors FOR DELETE
  USING (studio_id IS NOT NULL AND get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- 14. Drop deprecated org_role enum
DROP TYPE IF EXISTS public.org_role;
