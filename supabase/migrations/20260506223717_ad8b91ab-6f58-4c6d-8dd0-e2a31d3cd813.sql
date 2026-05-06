
CREATE TABLE public.sms_campaign_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sms_campaigns(id) ON DELETE SET NULL,
  studio_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  mode text NOT NULL,
  recipient_user_id uuid,
  recipient_phone text,
  recipient_email text,
  outcome text NOT NULL CHECK (outcome IN ('sent','failed','skipped_no_phone','blocked_opted_out')),
  reason text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_campaign_audit_studio ON public.sms_campaign_audit(studio_id, created_at DESC);
CREATE INDEX idx_sms_campaign_audit_campaign ON public.sms_campaign_audit(campaign_id);
CREATE INDEX idx_sms_campaign_audit_outcome ON public.sms_campaign_audit(studio_id, outcome);

ALTER TABLE public.sms_campaign_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view studio sms audit"
  ON public.sms_campaign_audit FOR SELECT TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can insert studio sms audit"
  ON public.sms_campaign_audit FOR INSERT TO authenticated
  WITH CHECK (
    get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role
    AND sender_id = auth.uid()
  );
