
-- Add phone and notification preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN phone text,
ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"sms": true, "email": true}'::jsonb;
