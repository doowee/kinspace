
-- Enums
CREATE TYPE public.payment_method AS ENUM ('card', 'cash', 'transfer', 'check');
CREATE TYPE public.transaction_status AS ENUM ('completed', 'refunded', 'failed');

-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'completed',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Owners/instructors can view all studio transactions
CREATE POLICY "Owners can view studio transactions"
  ON public.transactions FOR SELECT
  USING (
    get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor')
  );

-- Students can view only their own transactions
CREATE POLICY "Students can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can insert transactions
CREATE POLICY "Owners can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    get_studio_role(auth.uid(), studio_id) IN ('owner', 'instructor')
  );

-- Owners can update transactions
CREATE POLICY "Owners can update transactions"
  ON public.transactions FOR UPDATE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner');

-- Owners can delete transactions
CREATE POLICY "Owners can delete transactions"
  ON public.transactions FOR DELETE
  USING (get_studio_role(auth.uid(), studio_id) = 'owner');
