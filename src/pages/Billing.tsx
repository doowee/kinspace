import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  ExternalLink,
  CreditCard,
  Download,
  CheckCircle2,
  Link as LinkIcon,
  Zap,
  Receipt,
  CalendarDays,
  Check,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

// MVP: toggle this to preview connected vs not-connected states
const MOCK_CONNECTED = false;

const PLANS = [
  {
    tier: "standard" as const,
    name: "Standard",
    price: "$129",
    features: ["Unlimited classes & bookings", "Multi-location management", "Stripe payment processing", "Client portal & wallet", "Analytics dashboard"],
  },
  {
    tier: "pro" as const,
    name: "Pro Engine",
    price: "$169",
    badge: "Recommended",
    features: ["Everything in Standard", "AI Revenue Agent", "1-Tap SMS Flash Drops", "Smart Review automation", "Advanced BI insights"],
  },
];

export default function Billing() {
  const [isConnected] = useState(MOCK_CONNECTED);
  const { tier, isPro, loading, changeTier } = useSubscriptionTier();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  const handleChangePlan = async (newTier: "standard" | "pro") => {
    if (newTier === tier) return;
    setSwitching(true);
    const error = await changeTier(newTier);
    setSwitching(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: newTier === "pro" ? "Upgraded to Pro Engine! 🚀" : "Switched to Standard",
        description: newTier === "pro"
          ? "AI Marketing Hub and Flash Drops are now unlocked."
          : "You can upgrade back anytime.",
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Billing & Payouts
        </h2>
        <p className="mt-1 text-muted-foreground">
          Manage how you get paid and your Kinspace subscription
        </p>
      </div>

      {/* ─── Section 1: Plan Switcher ─── */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-foreground" />
            <CardTitle className="text-xl">Your Plan</CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            {loading ? "Loading…" : (
              <>
                You are on the{" "}
                <span className="font-semibold text-foreground">
                  {isPro ? "Pro Engine" : "Standard"}
                </span>{" "}
                plan ({isPro ? "$169" : "$129"}/mo).
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const isCurrent = plan.tier === tier;
              return (
                <div
                  key={plan.tier}
                  className={`relative rounded-xl border p-5 transition-all ${
                    isCurrent
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {plan.badge && (
                    <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5">
                      {plan.badge}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    {plan.tier === "pro" ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : (
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="font-display text-base font-bold text-foreground">{plan.name}</h3>
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                        <Check className="h-3 w-3 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Badge variant="outline" className="w-full justify-center py-1.5 text-xs">
                      Current Plan
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      variant={plan.tier === "pro" ? "default" : "outline"}
                      disabled={switching || loading}
                      onClick={() => handleChangePlan(plan.tier)}
                    >
                      {switching ? "Switching…" : plan.tier === "pro" ? "Upgrade to Pro" : "Switch to Standard"}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2: Billing Details ─── */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-foreground" />
            <CardTitle className="text-xl">Billing Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
              label="Next Billing Date"
              value="March 1st, 2026"
            />
            <DetailRow
              icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
              label="Payment Method"
              value="Visa ending in ****4242"
            />
          </div>
          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Update Payment Method
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download Past Invoices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 3: Get Paid (Stripe Connect) ─── */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-foreground" />
            <CardTitle className="text-xl">Client Payments & Payouts</CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            Connect your bank account to receive daily payouts from your class
            and membership sales. Kinspace takes $0 in success fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? <ConnectedState /> : <NotConnectedState />}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sub-components ─── */

function NotConnectedState() {
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 w-full text-center">
        <LinkIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          You haven't connected a bank account yet. Set up Stripe Connect to
          start receiving payouts from client purchases.
        </p>
        <Button size="lg" className="gap-2">
          <LinkIcon className="h-4 w-4" />
          Connect Bank Account (via Stripe)
        </Button>
      </div>
    </div>
  );
}

function ConnectedState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="gap-1.5 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Payouts Active
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          label="Connected Bank"
          value="Chase ****1234"
        />
        <DetailRow
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
          label="Payout Schedule"
          value="Daily (T+2)"
        />
      </div>
      <Button variant="outline" size="sm" className="gap-2">
        <ExternalLink className="h-4 w-4" />
        View Stripe Dashboard
      </Button>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
