
-- Create role enum
CREATE TYPE public.studio_role AS ENUM ('owner', 'instructor', 'student');

-- 1. Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Studios table (the tenant)
CREATE TABLE public.studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- 3. Studio members table (the link/keychain)
CREATE TABLE public.studio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE NOT NULL,
  role studio_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, studio_id)
);

ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

-- 4. Classes table (operational data)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  instructor_id UUID REFERENCES public.profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Security definer function to check studio membership
CREATE OR REPLACE FUNCTION public.is_studio_member(_user_id UUID, _studio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_members
    WHERE user_id = _user_id AND studio_id = _studio_id
  )
$$;

-- Security definer function to check studio role
CREATE OR REPLACE FUNCTION public.get_studio_role(_user_id UUID, _studio_id UUID)
RETURNS studio_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.studio_members
  WHERE user_id = _user_id AND studio_id = _studio_id
$$;

-- RLS Policies for studios
CREATE POLICY "Members can view their studios"
  ON public.studios FOR SELECT
  USING (public.is_studio_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create studios"
  ON public.studios FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their studios"
  ON public.studios FOR UPDATE
  USING (public.get_studio_role(auth.uid(), id) = 'owner');

CREATE POLICY "Owners can delete their studios"
  ON public.studios FOR DELETE
  USING (public.get_studio_role(auth.uid(), id) = 'owner');

-- RLS Policies for studio_members
CREATE POLICY "Members can view other members in their studios"
  ON public.studio_members FOR SELECT
  USING (public.is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Owners can manage members"
  ON public.studio_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    public.get_studio_role(auth.uid(), studio_id) = 'owner'
  );

CREATE POLICY "Owners can update members"
  ON public.studio_members FOR UPDATE
  USING (public.get_studio_role(auth.uid(), studio_id) = 'owner');

CREATE POLICY "Owners can remove members"
  ON public.studio_members FOR DELETE
  USING (public.get_studio_role(auth.uid(), studio_id) = 'owner');

-- RLS Policies for classes
CREATE POLICY "Members can view classes in their studios"
  ON public.classes FOR SELECT
  USING (public.is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Owners and instructors can create classes"
  ON public.classes FOR INSERT
  WITH CHECK (
    public.get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor')
  );

CREATE POLICY "Owners and instructors can update classes"
  ON public.classes FOR UPDATE
  USING (
    public.get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor')
  );

CREATE POLICY "Owners can delete classes"
  ON public.classes FOR DELETE
  USING (public.get_studio_role(auth.uid(), studio_id) = 'owner');

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studios_updated_at
  BEFORE UPDATE ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also allow users to view profiles of people in their studios
CREATE POLICY "Users can view profiles of studio co-members"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.studio_members sm1
      JOIN public.studio_members sm2 ON sm1.studio_id = sm2.studio_id
      WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.id
    )
  );
