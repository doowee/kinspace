
-- Table: products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  product_type VARCHAR NOT NULL CHECK (product_type IN ('pack', 'subscription')),
  point_value INTEGER,
  access_scope VARCHAR CHECK (access_scope IN ('single_studio', 'all_studios')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can create products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Members can view studio products" ON public.products
  FOR SELECT TO authenticated
  USING (is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT
  USING (is_active = true);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table: user_subscriptions
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  studio_id UUID REFERENCES public.studios(id),
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage studio subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role)
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
