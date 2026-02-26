
-- 1. Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add organization_id to studios
ALTER TABLE public.studios
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 3. Add organization_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 4. RLS for organizations: members of any studio in the org can view
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_members sm
    JOIN public.studios s ON s.id = sm.studio_id
    WHERE sm.user_id = _user_id AND s.organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_members sm
    JOIN public.studios s ON s.id = sm.studio_id
    WHERE sm.user_id = _user_id
      AND s.organization_id = _org_id
      AND sm.role = 'owner'
  )
$$;

-- Org RLS policies
CREATE POLICY "Org members can view their org"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Org owners can update their org"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (public.is_org_owner(auth.uid(), id));

CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org owners can delete their org"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_org_owner(auth.uid(), id));

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Update profiles RLS: staff in the same org can view profiles with matching organization_id
CREATE POLICY "Org staff can view org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );
