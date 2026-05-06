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
import { ChevronDown, Send } from "lucide-react";
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

export type BulkSmsMode = "reengage" | "renew";

interface BulkSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BulkSmsMode;
  recipients: BulkSmsRecipient[];
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
  defaultBody,
  onSent,
}: BulkSmsDialogProps) {
  const { activeStudio } = useStudio();
  const { user } = useAuth();
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
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

    for (const r of recipients) {
      if (r.sms_opted_out) {
        optedOut++;
        continue;
      }
      if (!r.phone) {
        skipped++;
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
        } else {
          sent++;
        }
      } catch (e) {
        failed++;
        console.warn("SMS error", r.email, e);
      }
    }

    setSending(false);

    // Log campaign (best-effort; don't block UX on failure)
    if (activeStudio?.id && user?.id) {
      const { error: logErr } = await supabase.from("sms_campaigns").insert({
        studio_id: activeStudio.id,
        sender_id: user.id,
        mode,
        recipient_count: recipients.length,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped + optedOut,
        body_preview: body.slice(0, 280),
      });
      if (logErr) console.warn("sms_campaigns insert failed", logErr);
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

  const copy = MODE_COPY[mode];
  const phoneCount = recipients.filter((r) => !!r.phone).length;
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
                Recipients ({phoneCount} with phone / {recipients.length} total)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-border p-2 text-xs text-muted-foreground space-y-0.5">
              {recipients.map((r) => (
                <div key={r.user_id} className="flex justify-between gap-2">
                  <span className="truncate">{displayName(r)}</span>
                  <span className="opacity-60 shrink-0">{r.phone ? "📱" : "—"}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <p className="text-[11px] text-muted-foreground">
            SMS rate-limited to 20/hr per sender.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
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
