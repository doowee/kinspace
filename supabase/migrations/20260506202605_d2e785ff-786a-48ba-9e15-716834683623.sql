
CREATE TABLE public.sms_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('reengage','renew')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  body_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_campaigns_studio_mode_created ON public.sms_campaigns (studio_id, mode, created_at DESC);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view studio campaigns"
ON public.sms_campaigns FOR SELECT TO authenticated
USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can insert studio campaigns"
ON public.sms_campaigns FOR INSERT TO authenticated
WITH CHECK (
  get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role
  AND sender_id = auth.uid()
);
