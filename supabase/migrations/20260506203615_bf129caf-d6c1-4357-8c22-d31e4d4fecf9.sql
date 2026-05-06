CREATE TABLE IF NOT EXISTS public.studio_sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('reengage','renew','winback')),
  body TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, mode)
);

ALTER TABLE public.studio_sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view studio sms templates"
  ON public.studio_sms_templates FOR SELECT TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can insert studio sms templates"
  ON public.studio_sms_templates FOR INSERT TO authenticated
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE POLICY "Owners can update studio sms templates"
  ON public.studio_sms_templates FOR UPDATE TO authenticated
  USING (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role)
  WITH CHECK (get_studio_role(auth.uid(), studio_id) = 'owner'::studio_role);

CREATE TRIGGER trg_studio_sms_templates_updated
BEFORE UPDATE ON public.studio_sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();