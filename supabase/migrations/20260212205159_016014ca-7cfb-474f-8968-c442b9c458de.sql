
-- Enum for org roles
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'viewer');

-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members table
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Add organization_id to studios (nullable for now)
ALTER TABLE public.studios ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Timestamp trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS org_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id;
$$;

-- RLS policies for organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (is_org_member(auth.uid(), id));

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (get_org_role(auth.uid(), id) = 'owner');

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can delete their organizations"
  ON public.organizations FOR DELETE
  USING (get_org_role(auth.uid(), id) = 'owner');

-- RLS policies for organization_members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Owners can manage org members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR
    (get_org_role(auth.uid(), organization_id) = 'owner')
  );

CREATE POLICY "Owners can update org members"
  ON public.organization_members FOR UPDATE
  USING (get_org_role(auth.uid(), organization_id) = 'owner');

CREATE POLICY "Owners can remove org members"
  ON public.organization_members FOR DELETE
  USING (get_org_role(auth.uid(), organization_id) = 'owner');

-- Auto-create orgs for existing studio owners and assign their studios
DO $$
DECLARE
  rec RECORD;
  _org_id uuid;
  _studio_name text;
BEGIN
  FOR rec IN
    SELECT DISTINCT owner_id FROM public.studios WHERE organization_id IS NULL
  LOOP
    -- Use first studio name for org name
    SELECT name INTO _studio_name FROM public.studios
      WHERE owner_id = rec.owner_id ORDER BY created_at ASC LIMIT 1;

    INSERT INTO public.organizations (name, slug)
    VALUES (
      _studio_name || ' Org',
      _studio_name || '-org-' || substr(gen_random_uuid()::text, 1, 8)
    )
    RETURNING id INTO _org_id;

    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (rec.owner_id, _org_id, 'owner');

    UPDATE public.studios SET organization_id = _org_id WHERE owner_id = rec.owner_id;
  END LOOP;
END;
$$;

-- Function to create org with membership
CREATE OR REPLACE FUNCTION public.create_org_with_membership(_name text, _slug text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _org_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (_user_id, _org_id, 'owner');

  RETURN _org_id;
END;
$$;
