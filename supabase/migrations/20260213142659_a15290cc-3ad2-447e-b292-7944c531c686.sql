-- Allow anyone to view active packages (for public packages page)
CREATE POLICY "Anyone can view active packages"
ON public.packages
FOR SELECT
USING (active = true);
