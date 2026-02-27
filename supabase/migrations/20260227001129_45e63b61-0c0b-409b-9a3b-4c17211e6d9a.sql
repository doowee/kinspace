
-- Packages table for dynamic pricing tiers
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_packages_studio ON public.packages(studio_id);
CREATE INDEX IF NOT EXISTS idx_packages_org ON public.packages(organization_id);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages (for public booking pages)
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
CREATE POLICY "Public can view active packages"
  ON public.packages FOR SELECT
  USING (is_active = true);

-- Studio members can view all packages
DROP POLICY IF EXISTS "Members can view all packages" ON public.packages;
CREATE POLICY "Members can view all packages"
  ON public.packages FOR SELECT
  USING (is_studio_member(auth.uid(), studio_id));

-- Owners can manage packages
DROP POLICY IF EXISTS "Owners can create packages" ON public.packages;
CREATE POLICY "Owners can create packages"
  ON public.packages FOR INSERT
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

DROP POLICY IF EXISTS "Owners can update packages" ON public.packages;
CREATE POLICY "Owners can update packages"
  ON public.packages FOR UPDATE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

DROP POLICY IF EXISTS "Owners can delete packages" ON public.packages;
CREATE POLICY "Owners can delete packages"
  ON public.packages FOR DELETE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

-- Auto-update timestamps
CREATE OR REPLACE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
