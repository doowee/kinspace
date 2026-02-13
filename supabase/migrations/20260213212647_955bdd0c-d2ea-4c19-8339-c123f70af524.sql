
-- Function to get all students across an organization with their home studio
CREATE OR REPLACE FUNCTION public.get_org_students(_org_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  home_studio_name text,
  total_bookings bigint,
  last_booking_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH org_studios AS (
    SELECT id, name FROM public.studios WHERE organization_id = _org_id
  ),
  org_student_ids AS (
    -- Students with bookings at any org studio
    SELECT DISTINCT b.user_id
    FROM public.bookings b
    WHERE b.studio_id IN (SELECT id FROM org_studios)
    UNION
    -- Students with passes at any org studio
    SELECT DISTINCT sp.user_id
    FROM public.student_passes sp
    WHERE sp.studio_id IN (SELECT id FROM org_studios)
    UNION
    -- Students who are studio members
    SELECT DISTINCT sm.user_id
    FROM public.studio_members sm
    WHERE sm.studio_id IN (SELECT id FROM org_studios) AND sm.role = 'student'
  ),
  booking_counts AS (
    SELECT b.user_id, b.studio_id, COUNT(*) as cnt
    FROM public.bookings b
    WHERE b.studio_id IN (SELECT id FROM org_studios)
      AND b.status IN ('confirmed', 'checked_in')
    GROUP BY b.user_id, b.studio_id
  ),
  home_studios AS (
    SELECT DISTINCT ON (bc.user_id)
      bc.user_id,
      os.name as studio_name
    FROM booking_counts bc
    JOIN org_studios os ON os.id = bc.studio_id
    ORDER BY bc.user_id, bc.cnt DESC
  ),
  student_stats AS (
    SELECT
      b.user_id,
      COUNT(*) as total_bookings,
      MAX(b.created_at) as last_booking_at
    FROM public.bookings b
    WHERE b.studio_id IN (SELECT id FROM org_studios)
      AND b.status IN ('confirmed', 'checked_in')
    GROUP BY b.user_id
  )
  SELECT
    p.id as user_id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(hs.studio_name, 'No bookings yet') as home_studio_name,
    COALESCE(ss.total_bookings, 0) as total_bookings,
    ss.last_booking_at
  FROM org_student_ids osi
  JOIN public.profiles p ON p.id = osi.user_id
  LEFT JOIN home_studios hs ON hs.user_id = osi.user_id
  LEFT JOIN student_stats ss ON ss.user_id = osi.user_id
  ORDER BY p.first_name, p.last_name, p.email;
$$;
