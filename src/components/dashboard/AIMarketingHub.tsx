import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Clock, Users, Send, TrendingUp, UserX, UserCheck, Repeat, Zap, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type AudienceType = "inactive" | "all-students" | "past-attendees";

const AUDIENCE_CONFIG: Record<AudienceType, { label: string; icon: typeof UserX }> = {
  inactive: { label: "Inactive Clients", icon: UserX },
  "all-students": { label: "All Students", icon: Users },
  "past-attendees": { label: "Past Attendees", icon: UserCheck },
};

interface Opportunity {
  id: string;
  className: string;
  instructor: string;
  day: string;
  time: string;
  spotsOpen: number;
  capacity: number;
  audience: AudienceType;
}

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    className: "Reformer Flow",
    instructor: "Sarah",
    day: "Thursday",
    time: "6:00 AM",
    spotsOpen: 8,
    capacity: 14,
    audience: "inactive",
  },
  {
    id: "opp-2",
    className: "Mat Pilates Sculpt",
    instructor: "Elena",
    day: "Friday",
    time: "12:00 PM",
    spotsOpen: 6,
    capacity: 10,
    audience: "past-attendees",
  },
];

/* Flash Deal / Yield Management card */
const FLASH_DEAL = {
  id: "opp-flash",
  title: "Yield Management: Monetize Dead Space",
  insight:
    "Sarah's 5 PM Flow starts in 1 hour and has 3 empty spots. The Revenue Agent can blast a 50% off 'Flash Drop' to your waitlist and local regulars.",
};

/* Conversion Agent upsell card data */
const UPSELL_OPPORTUNITY = {
  id: "opp-upsell",
  clientCount: 12,
  insight:
    "12 clients have purchased three consecutive 10-class packs. The Conversion Agent can offer them a first-month discount to upgrade to an Unlimited Monthly Membership.",
};

const GENERATED_EMAILS: Record<string, { subject: string; body: string; recipientCount: number }> = {
  "opp-1": {
    subject: "Your mat is calling... 🤍 (+ a gift for tomorrow!)",
    body: `Hi [First Name],

We noticed it's been a minute since we saw you in the studio! Sarah is teaching a beautiful Reformer Flow tomorrow at 6:00 AM, and we have a few spots left.

Because we'd love to see you, book this class for just 0.5 pts instead of the usual 1 pt — on us!

Tap here to claim your reformer. See you in the morning!

- The Team at Kinspace.Studio`,
    recipientCount: 42,
  },
  "opp-2": {
    subject: "Midday reset? Elena saved you a spot 🧘‍♀️",
    body: `Hi [First Name],

Feeling the midweek slump? Elena's Mat Pilates Sculpt this Friday at noon is the perfect reset — and we have a few spots left just for you.

Reply to this email or tap below to book instantly. Your body will thank you.

See you on the mat!

- The Team at Kinspace.Studio`,
    recipientCount: 31,
  },
};

export default function AIMarketingHub() {
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);

  // Flash Drop / Revenue Agent state
  const [flashDropLoading, setFlashDropLoading] = useState(false);
  const [flashDropSms, setFlashDropSms] = useState("");
  const [flashDropModalOpen, setFlashDropModalOpen] = useState(false);
  const [flashDropTone, setFlashDropTone] = useState("Urgent");

  const handleAutoDraft = (opp: Opportunity) => {
    setGeneratingId(opp.id);
    setTimeout(() => {
      setGeneratingId(null);
      const email = GENERATED_EMAILS[opp.id];
      if (email) {
        setActiveOpp(opp);
        setEditSubject(email.subject);
        setEditBody(email.body);
        setRecipientCount(email.recipientCount);
        setEditorOpen(true);
      }
    }, 2500);
  };

  const handleFlashDrop = async () => {
    setFlashDropLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flash-drop", {
        body: {
          className: "Reformer Flow",
          instructorName: "Sarah",
          spotsAvailable: 3,
          timeUntilClass: "1 hour",
          tonePreference: flashDropTone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setFlashDropSms(data.sms || "");
      setFlashDropModalOpen(true);
    } catch (err: any) {
      toast({
        title: "Revenue Agent Error",
        description: err.message || "Failed to generate SMS copy.",
        variant: "destructive",
      });
    } finally {
      setFlashDropLoading(false);
    }
  };

  const handleFlashDropSend = () => {
    setFlashDropModalOpen(false);
    toast({
      title: "Flash Drop successful! $35 recovered.",
      description: "1 discounted spot sold. The class roster has been updated.",
    });
    window.dispatchEvent(new CustomEvent("flash-deal-sold"));

  const handleSend = () => {
    if (!activeOpp) return;
    setEditorOpen(false);
    setOpportunities((prev) => prev.filter((o) => o.id !== activeOpp.id));
    toast({
      title: "Campaign Sent! Tracking revenue...",
      description: `Email delivered to ${recipientCount} ${AUDIENCE_CONFIG[activeOpp.audience].label.toLowerCase()} for ${activeOpp.className}.`,
    });
    setActiveOpp(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            Revenue Opportunities
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Classes in the next 3 days under 50% capacity. Let AI fill the empty spots.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No low-attendance classes right now. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map((opp) => {
            const isGenerating = generatingId === opp.id;
            const fillPct = Math.round(
              ((opp.capacity - opp.spotsOpen) / opp.capacity) * 100
            );

            return (
              <Card key={opp.id} className="relative overflow-hidden">
                {isGenerating && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/95 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                      <span className="text-sm font-medium text-foreground italic">
                        AI is analyzing class history and writing your campaign...
                      </span>
                    </div>
                    <div className="w-3/4 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                )}
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {opp.day} {opp.time} — {opp.className}
                      </p>
                      {(() => {
                        const cfg = AUDIENCE_CONFIG[opp.audience];
                        const AudienceIcon = cfg.icon;
                        return (
                          <Badge variant="outline" className="gap-1 text-[10px] font-medium">
                            <AudienceIcon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      with {opp.instructor}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">
                        {opp.spotsOpen} spots open
                      </span>
                      <span>of {opp.capacity}</span>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {fillPct}%
                    </span>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => handleAutoDraft(opp)}
                    disabled={isGenerating}
                  >
                    <Sparkles className="h-4 w-4" />
                    Deploy Marketing Agent
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Yield Management + Conversion Agent ─────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{FLASH_DEAL.title}</p>
                <p className="text-xs text-muted-foreground">The Revenue Agent</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {FLASH_DEAL.insight}
            </p>
            <Button
              className="w-full gap-2"
              onClick={() => {
                toast({
                  title: "Flash Drop successful! $35 recovered.",
                  description: "1 discounted spot sold. The class roster has been updated.",
                });
                window.dispatchEvent(new CustomEvent("flash-deal-sold"));
              }}
            >
              <Sparkles className="h-4 w-4" />
              Deploy Flash Drop
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Membership Upsell Opportunity</p>
                <p className="text-xs text-muted-foreground">The Conversion Agent</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {UPSELL_OPPORTUNITY.insight}
            </p>
            <Button
              className="w-full gap-2"
              onClick={() => {
                toast({
                  title: "Conversion Agent Deployed",
                  description: `Personalized upgrade offers are being sent to ${UPSELL_OPPORTUNITY.clientCount} clients.`,
                });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Deploy Conversion Agent
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Approval Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI-Generated Campaign
            </DialogTitle>
            <DialogDescription>
              Review and edit the copy below, then approve to send.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Subject Line
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Email Body
              </label>
              <Textarea
                className="min-h-[200px] text-sm leading-relaxed"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} className="gap-2">
              <Send className="h-4 w-4" />
              Approve &amp; Send to {recipientCount} {activeOpp ? AUDIENCE_CONFIG[activeOpp.audience].label : "Clients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
