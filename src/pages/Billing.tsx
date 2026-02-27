import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionTier } from "@/hooks/use-subscription-tier";
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
  MapPin,
} from "lucide-react";

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

interface StudioBilling {
  id: string;
  name: string;
  location: string | null;
  stripe_account_id: string | null;
  subscription_tier: string;
}

export default function Billing() {
  const { memberships } = useStudio();
  const { toast } = useToast();
  const [studios, setStudios] = useState<StudioBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  // Fetch all studios the owner has
  useEffect(() => {
    const ownerStudioIds = memberships
      .filter((m) => m.role === "owner")
      .map((m) => m.studio_id);

    if (ownerStudioIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("studios")
        .select("id, name, location, stripe_account_id, subscription_tier")
        .in("id", ownerStudioIds);

      setStudios((data as StudioBilling[]) ?? []);
      setLoading(false);
    };

    fetch();
  }, [memberships]);

  const handleChangeTier = async (studioId: string, newTier: SubscriptionTier) => {
    setSwitching(studioId);
    const { error } = await supabase
      .from("studios")
      .update({ subscription_tier: newTier } as any)
      .eq("id", studioId);

    setSwitching(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStudios((prev) =>
        prev.map((s) => (s.id === studioId ? { ...s, subscription_tier: newTier } : s))
      );
      toast({
        title: newTier === "pro" ? "Upgraded to Pro Engine! 🚀" : "Switched to Standard",
        description: newTier === "pro"
          ? "AI Marketing Hub and Flash Drops are now unlocked for this location."
          : "You can upgrade back anytime.",
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Billing & Payouts
        </h2>
        <p className="mt-1 text-muted-foreground">
          Manage subscriptions and payouts per studio location
        </p>
      </div>

      {/* ─── Per-Studio Billing Cards ─── */}
      {loading ? (
        <div className="text-muted-foreground text-sm">Loading studios…</div>
      ) : studios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No studios found. Create a studio first.
          </CardContent>
        </Card>
      ) : (
        studios.map((studio) => {
          const tier = (studio.subscription_tier as SubscriptionTier) || "standard";
          const isConnected = !!studio.stripe_account_id;
          const currentPlan = PLANS.find((p) => p.tier === tier) ?? PLANS[0];
          const otherPlan = PLANS.find((p) => p.tier !== tier)!;
          const isSwitching = switching === studio.id;

          return (
            <Card key={studio.id} className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{studio.name}</CardTitle>
                    {studio.location && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        {studio.location}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${tier === "pro" ? "border-primary text-primary" : ""}`}
                  >
                    {currentPlan.name} · {currentPlan.price}/mo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Subscription Plan */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLANS.map((plan) => {
                    const isCurrent = plan.tier === tier;
                    return (
                      <div
                        key={plan.tier}
                        className={`relative rounded-xl border p-4 transition-all ${
                          isCurrent
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        {plan.badge && (
                          <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                            {plan.badge}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          {plan.tier === "pro" ? (
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="font-display text-sm font-bold text-foreground">{plan.name}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xl font-bold text-foreground">{plan.price}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        <ul className="space-y-1 mb-3">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-[11px] text-foreground">
                              <Check className="h-2.5 w-2.5 shrink-0 text-primary" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <Badge variant="outline" className="w-full justify-center py-1 text-[10px]">
                            Current Plan
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full gap-1 text-xs"
                            variant={plan.tier === "pro" ? "default" : "outline"}
                            disabled={isSwitching}
                            onClick={() => handleChangeTier(studio.id, plan.tier)}
                          >
                            {isSwitching ? "Switching…" : plan.tier === "pro" ? "Upgrade to Pro" : "Switch to Standard"}
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Bank Connection */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Client Payments & Payouts</p>
                  {isConnected ? (
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payouts Active
                      </Badge>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Stripe Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                      <LinkIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-3">
                        Connect a bank account to receive payouts for this location.
                      </p>
                      <Button size="sm" className="gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Connect Bank Account
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* ─── Global Billing Details ─── */}
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
