
ALTER TABLE public.profiles ADD COLUMN staff_notes text;

CREATE POLICY "Staff can update student staff_notes"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM studio_members sm1
    JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = profiles.id
      AND sm1.role IN ('owner', 'instructor')
  )
);
