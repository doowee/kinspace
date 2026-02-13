
-- Allow instructors to see classes assigned to them, regardless of studio membership
CREATE POLICY "Instructors can view their assigned classes"
ON public.classes FOR SELECT
USING (
  instructor_id IN (
    SELECT id FROM public.instructors WHERE user_id = auth.uid()
  )
);

-- Allow instructors to view bookings for their assigned classes
CREATE POLICY "Instructors can view bookings for their classes"
ON public.bookings FOR SELECT
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE i.user_id = auth.uid()
  )
);

-- Allow instructors to update bookings for their classes (check-in)
CREATE POLICY "Instructors can update bookings for their classes"
ON public.bookings FOR UPDATE
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE i.user_id = auth.uid()
  )
);

-- Allow instructors to view profiles of students in their classes
CREATE POLICY "Instructors can view student profiles for their classes"
ON public.profiles FOR SELECT
USING (
  id IN (
    SELECT b.user_id FROM public.bookings b
    JOIN public.classes c ON c.id = b.class_id
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE i.user_id = auth.uid()
  )
);
