
-- Allow authenticated users to view all studios (needed for cross-studio instructor views)
CREATE POLICY "Authenticated users can view all studios"
ON public.studios FOR SELECT TO authenticated
USING (true);
