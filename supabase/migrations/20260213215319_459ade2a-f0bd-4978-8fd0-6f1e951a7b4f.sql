
ALTER TABLE public.bookings
ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;
