
-- Tighten the org insert policy - drop the overly permissive one
DROP POLICY "Authenticated users can create orgs" ON public.organizations;

-- Add owner_id column so we can track who created the org
ALTER TABLE public.organizations ADD COLUMN owner_id UUID REFERENCES public.profiles(id);

-- Recreate with ownership check
CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);
