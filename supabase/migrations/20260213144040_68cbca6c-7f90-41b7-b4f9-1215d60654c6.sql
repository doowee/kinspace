-- Allow students to create their own transaction records (for manual payment tracking)
CREATE POLICY "Users can insert own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);