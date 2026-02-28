
-- Remove the anon policy that still exposes stripe_account_id
DROP POLICY IF EXISTS "Anon can view studios for public pages" ON public.studios;

-- Drop the view since it's not needed - public access goes through SECURITY DEFINER RPCs
DROP VIEW IF EXISTS public.studios_public;
