-- Allow authenticated users to create their own student passes (for self-purchase on public packages page)
CREATE POLICY "Users can purchase passes for themselves"
ON public.student_passes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own passes (for credit refund on cancel)
CREATE POLICY "Users can update own passes"
ON public.student_passes
FOR UPDATE
USING (auth.uid() = user_id);
