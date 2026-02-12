
-- Packages table (product catalog)
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  credits integer NOT NULL,
  expiration_days integer NOT NULL DEFAULT 90,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Studio members can view their studio's packages
CREATE POLICY "Members can view studio packages"
  ON public.packages FOR SELECT
  USING (is_studio_member(auth.uid(), studio_id));

-- Owners can manage packages
CREATE POLICY "Owners can create packages"
  ON public.packages FOR INSERT
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner');

CREATE POLICY "Owners can update packages"
  ON public.packages FOR UPDATE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner');

CREATE POLICY "Owners can delete packages"
  ON public.packages FOR DELETE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner');

-- Student passes table (user's wallet)
CREATE TABLE public.student_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_passes ENABLE ROW LEVEL SECURITY;

-- Studio owners/instructors can view all passes in their studio
CREATE POLICY "Staff can view studio passes"
  ON public.student_passes FOR SELECT
  USING (get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor'));

-- Students can view their own passes
CREATE POLICY "Students can view own passes"
  ON public.student_passes FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can create passes (e.g. when selling a package)
CREATE POLICY "Owners can create passes"
  ON public.student_passes FOR INSERT
  WITH CHECK (get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor'));

-- Owners can update passes (e.g. decrement credits)
CREATE POLICY "Owners can update passes"
  ON public.student_passes FOR UPDATE
  USING (get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor'));

-- Owners can delete passes
CREATE POLICY "Owners can delete passes"
  ON public.student_passes FOR DELETE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner');
