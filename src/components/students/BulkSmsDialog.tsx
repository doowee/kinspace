import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, Send, Save } from "lucide-react";
import { toast } from "sonner";

export interface BulkSmsRecipient {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  sms_opted_out?: boolean | null;
  subscription_period_end?: string | null;
}

export type BulkSmsMode = "reengage" | "renew" | "winback";

interface BulkSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BulkSmsMode;
  recipients: BulkSmsRecipient[];
  /** Students excluded from `recipients` because they replied STOP (sms_opted_out). */
  excludedOptedOut?: BulkSmsRecipient[];
  defaultBody: string;
  onSent?: () => void;
}

const MODE_COPY: Record<BulkSmsMode, { title: string; description: (n: number) => string }> = {
  reengage: {
    title: "Re-engage via SMS",
    description: (n) =>
      `Send a win-back SMS to ${n} student${n === 1 ? "" : "s"} who haven't booked recently.`,
  },
  renew: {
    title: "Renewal nudge via SMS",
    description: (n) =>
      `Remind ${n} member${n === 1 ? "" : "s"} whose membership is expiring soon to renew.`,
  },
  winback: {
    title: "Win back lapsed members via SMS",
    description: (n) =>
      `Reach out to ${n} member${n === 1 ? "" : "s"} whose membership lapsed in the last 30 days.`,
  },
};

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function displayName(r: BulkSmsRecipient): string {
  if (r.first_name || r.last_name) return [r.first_name, r.last_name].filter(Boolean).join(" ");
  return r.email;
}

export default function BulkSmsDialog({
  open,
  onOpenChange,
  mode,
  recipients,
  excludedOptedOut = [],
  defaultBody,
  onSent,
}: BulkSmsDialogProps) {
  const { activeStudio } = useStudio();
  const { user } = useAuth();
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [ownerFirstName, setOwnerFirstName] = useState<string | null>(null);

  // Reset body whenever the dialog reopens with a different default
  useEffect(() => {
    if (open) setBody(defaultBody);
  }, [open, defaultBody]);

  // Load owner phone for "Send test to me"
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone, first_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setOwnerPhone(data?.phone ?? null);
      setOwnerFirstName(data?.first_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const studioName = activeStudio?.name ?? "the studio";
  const slug = activeStudio?.slug ?? "";
  const bookingUrl =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/book/${slug}`
      : typeof window !== "undefined"
        ? window.location.origin
        : "";

  const renderToken = (
    tpl: string,
    firstName: string | null,
    daysLeft: number,
  ): string =>
    tpl
      .replace(/\{first_name\}/g, firstName || "there")
      .replace(/\{studio_name\}/g, studioName)
      .replace(/\{booking_url\}/g, bookingUrl)
      .replace(/\{days_left\}/g, String(daysLeft));

  const handleSend = async () => {
    const sendable = recipients.filter((r) => r.phone && !r.sms_opted_out);
    if (sendable.length === 0) {
      toast.error("No recipients");
      return;
    }
    setSending(true);
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let optedOut = 0;

    type AuditRow = {
      recipient_user_id: string | null;
      recipient_phone: string | null;
      recipient_email: string | null;
      outcome: "sent" | "failed" | "skipped_no_phone" | "blocked_opted_out";
      reason: string | null;
      error_message: string | null;
    };
    const auditRows: AuditRow[] = [];

    // Record everyone surfaced as excluded due to STOP (not in `recipients` when toggle on)
    for (const r of excludedOptedOut) {
      auditRows.push({
        recipient_user_id: r.user_id ?? null,
        recipient_phone: r.phone ?? null,
        recipient_email: r.email ?? null,
        outcome: "blocked_opted_out",
        reason: "Recipient previously replied STOP (sms_opted_out=true)",
        error_message: null,
      });
    }

    for (const r of recipients) {
      if (r.sms_opted_out) {
        optedOut++;
        auditRows.push({
          recipient_user_id: r.user_id ?? null,
          recipient_phone: r.phone ?? null,
          recipient_email: r.email ?? null,
          outcome: "blocked_opted_out",
          reason: "Recipient previously replied STOP (sms_opted_out=true)",
          error_message: null,
        });
        continue;
      }
      if (!r.phone) {
        skipped++;
        auditRows.push({
          recipient_user_id: r.user_id ?? null,
          recipient_phone: null,
          recipient_email: r.email ?? null,
          outcome: "skipped_no_phone",
          reason: "No phone number on file",
          error_message: null,
        });
        continue;
      }
      const days = daysUntil(r.subscription_period_end);
      try {
        const { error } = await supabase.functions.invoke("send-twilio-sms", {
          body: {
            targetPhoneNumber: r.phone,
            messageBody: renderToken(body, r.first_name, days),
          },
        });
        if (error) {
          failed++;
          console.warn("SMS failed", r.email, error);
          auditRows.push({
            recipient_user_id: r.user_id ?? null,
            recipient_phone: r.phone,
            recipient_email: r.email ?? null,
            outcome: "failed",
            reason: "Twilio send returned an error",
            error_message: error.message ?? String(error),
          });
        } else {
          sent++;
          auditRows.push({
            recipient_user_id: r.user_id ?? null,
            recipient_phone: r.phone,
            recipient_email: r.email ?? null,
            outcome: "sent",
            reason: null,
            error_message: null,
          });
        }
      } catch (e: any) {
        failed++;
        console.warn("SMS error", r.email, e);
        auditRows.push({
          recipient_user_id: r.user_id ?? null,
          recipient_phone: r.phone,
          recipient_email: r.email ?? null,
          outcome: "failed",
          reason: "Exception thrown during send",
          error_message: e?.message ?? String(e),
        });
      }
    }

    setSending(false);

    // Log campaign (best-effort; don't block UX on failure)
    let campaignId: string | null = null;
    if (activeStudio?.id && user?.id) {
      const { data: campaignData, error: logErr } = await supabase
        .from("sms_campaigns")
        .insert({
          studio_id: activeStudio.id,
          sender_id: user.id,
          mode,
          recipient_count: recipients.length + excludedOptedOut.length,
          sent_count: sent,
          failed_count: failed,
          skipped_count: skipped + optedOut + excludedOptedOut.length,
          body_preview: body.slice(0, 280),
        })
        .select("id")
        .maybeSingle();
      if (logErr) console.warn("sms_campaigns insert failed", logErr);
      campaignId = campaignData?.id ?? null;

      if (auditRows.length > 0) {
        const { error: auditErr } = await supabase
          .from("sms_campaign_audit")
          .insert(
            auditRows.map((r) => ({
              ...r,
              campaign_id: campaignId,
              studio_id: activeStudio.id,
              sender_id: user.id,
              mode,
            })),
          );
        if (auditErr) console.warn("sms_campaign_audit insert failed", auditErr);
      }
    }

    onOpenChange(false);
    onSent?.();
    const parts: string[] = [`${sent} sent`];
    if (failed) parts.push(`${failed} failed`);
    if (skipped) parts.push(`${skipped} skipped (no phone)`);
    if (optedOut) parts.push(`${optedOut} opted out`);
    toast.success(`SMS complete — ${parts.join(" · ")}`);
  };

  const handleTestSend = async () => {
    if (!ownerPhone) return;
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("send-twilio-sms", {
        body: {
          targetPhoneNumber: ownerPhone,
          // Realistic preview: owner's name, placeholder days_left = 2
          messageBody: renderToken(body, ownerFirstName, 2),
        },
      });
      if (error) {
        toast.error(`Test send failed: ${error.message ?? "unknown error"}`);
      } else {
        toast.success(`Test SMS sent to ${ownerPhone}`);
      }
    } catch (e: any) {
      toast.error(`Test send failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!activeStudio?.id || !user?.id) return;
    if (body.trim().length === 0) return;
    setSavingTpl(true);
    const { error } = await supabase
      .from("studio_sms_templates")
      .upsert(
        {
          studio_id: activeStudio.id,
          mode,
          body: body.trim(),
          updated_by: user.id,
        },
        { onConflict: "studio_id,mode" },
      );
    setSavingTpl(false);
    if (error) {
      toast.error(`Couldn't save template: ${error.message}`);
    } else {
      toast.success("Saved as this studio's default");
    }
  };

  const copy = MODE_COPY[mode];
  const optedOutCount = recipients.filter((r) => r.sms_opted_out).length;
  const phoneCount = recipients.filter((r) => !!r.phone && !r.sms_opted_out).length;
  const sendDisabled = sending || phoneCount === 0 || body.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description(recipients.length)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-sms-body" className="text-xs">
              Message body
            </Label>
            <Textarea
              id="bulk-sms-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Tokens: <code>{"{first_name}"}</code>, <code>{"{studio_name}"}</code>,{" "}
              <code>{"{booking_url}"}</code>
              {mode === "renew" && (
                <>
                  , <code>{"{days_left}"}</code>
                </>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground italic">
              SMS only. Marketing email is handled by your dedicated marketing provider.
            </p>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1">
                <ChevronDown className="h-3 w-3" />
                Recipients ({phoneCount} sendable / {recipients.length} total
                {optedOutCount > 0 ? ` · ${optedOutCount} opted out` : ""})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-border p-2 text-xs text-muted-foreground space-y-0.5">
              {recipients.map((r) => (
                <div key={r.user_id} className="flex justify-between gap-2">
                  <span className="truncate">{displayName(r)}</span>
                  <span className="opacity-60 shrink-0">
                    {r.sms_opted_out ? "🚫 opted out" : r.phone ? "📱" : "—"}
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {(optedOutCount > 0 || excludedOptedOut.length > 0) && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1 text-amber-700 hover:text-amber-800"
                >
                  <ChevronDown className="h-3 w-3" />
                  {optedOutCount + excludedOptedOut.length} excluded — replied STOP (sms_opted_out)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-800 space-y-0.5">
                {[...excludedOptedOut, ...recipients.filter((r) => r.sms_opted_out)].map((r) => (
                  <div key={r.user_id} className="flex justify-between gap-2">
                    <span className="truncate">{displayName(r)}</span>
                    <span className="opacity-60 shrink-0">🚫 STOP</span>
                  </div>
                ))}
                <p className="pt-1 text-[10px] opacity-70 italic">
                  These students will not receive this campaign. They re-enter the list only if they reply START.
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          <p className="text-[11px] text-muted-foreground">
            SMS rate-limited to 20/hr per sender.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestSend}
                      disabled={testing || sending || !ownerPhone || body.trim().length === 0}
                      className="gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      {testing ? "Sending…" : "Send test to me"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!ownerPhone && (
                  <TooltipContent>Add a phone number to your profile</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={savingTpl || sending || body.trim().length === 0}
              className="gap-1.5"
              title="Save this message as the studio's default for this composer"
            >
              <Save className="h-3 w-3" />
              {savingTpl ? "Saving…" : "Save as default"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sendDisabled}>
              {sending ? "Sending…" : `Send to ${phoneCount}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
