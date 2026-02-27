-- Add pin_code to instructors for kiosk login
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS pin_code text;

-- Add injury_notes to profiles for student health flags
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS injury_notes text;