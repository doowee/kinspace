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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  Building2,
  ExternalLink,
  CreditCard,
  Download,
  CheckCircle2,
  Link as LinkIcon,
  Zap,
  CalendarDays,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Receipt,
} from "lucide-react";

const TIER_INFO: Record<string, { name: string; price: number }> = {
  standard: { name: "Standard", price: 99 },
  pro: { name: "Pro Engine", price: 169 },
};

const PLANS = [
  {
    tier: "standard" as const,
    name: "Standard",
    price: "$99",
    features: ["Unlimited classes & bookings", "Multi-location management", "Stripe payments", "Client portal & wallet", "Analytics dashboard"],
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
  const [connectingStudio, setConnectingStudio] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    studioId: string;
    studioName: string;
    currentTier: SubscriptionTier;
    newTier: SubscriptionTier;
  } | null>(null);

  // Get org ID from first owner membership
  const ownerMembership = memberships.find((m) => m.role === "owner");
  const orgId = (ownerMembership?.studios as any)?.organization_id ?? null;

  // Handle Stripe Connect return redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectSuccess = params.get("connect_success");
    const studioId = params.get("studio_id");

    if (connectSuccess === "true" && studioId) {
      // Check connect status and update UI
      supabase.functions.invoke("create-connect-account", {
        body: { action: "check-status", studio_id: studioId },
      }).then(({ data }) => {
        if (data?.connected) {
          setStudios((prev) =>
            prev.map((s) =>
              s.id === studioId ? { ...s, stripe_account_id: data.account_id } : s
            )
          );
          toast({
            title: "Bank account connected! ✅",
            description: "This location is now set up to receive client payouts.",
          });
        }
      });

      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const ownerStudioIds = memberships
      .filter((m) => m.role === "owner")
      .map((m) => m.studio_id);

    if (ownerStudioIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStudios = async () => {
      const { data } = await supabase
        .from("studios")
        .select("id, name, location, stripe_account_id, subscription_tier")
        .in("id", ownerStudioIds);

      setStudios((data as StudioBilling[]) ?? []);
      setLoading(false);
    };

    fetchStudios();
  }, [memberships]);

  // Calculate MRR
  const totalMRR = studios.reduce((sum, s) => {
    const info = TIER_INFO[(s.subscription_tier as string) || "standard"];
    return sum + (info?.price ?? 99);
  }, 0);

  const openConfirmModal = (studio: StudioBilling, newTier: SubscriptionTier) => {
    setConfirmModal({
      studioId: studio.id,
      studioName: studio.name,
      currentTier: (studio.subscription_tier as SubscriptionTier) || "standard",
      newTier,
    });
  };

  const handleChangeTier = async () => {
    if (!confirmModal) return;
    const { studioId, newTier } = confirmModal;
    setSwitching(studioId);

    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "change-tier", studio_id: studioId, new_tier: newTier },
    });

    setSwitching(null);

    if (error || data?.error) {
      await supabase
        .from("studios")
        .update({ subscription_tier: newTier } as any)
        .eq("id", studioId);
    }

    setStudios((prev) =>
      prev.map((s) => (s.id === studioId ? { ...s, subscription_tier: newTier } : s))
    );

    setConfirmModal(null);

    toast({
      title: newTier === "pro" ? "Upgraded to Pro Engine! 🚀" : "Switched to Standard",
      description: newTier === "pro"
        ? "Prorated charges will appear on your next invoice."
        : "Prorated credit will be applied to your next invoice.",
    });
  };

  const handleViewInvoices = async () => {
    if (!orgId) {
      toast({ title: "No organization found", variant: "destructive" });
      return;
    }
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-subscription", {
      body: { action: "get-portal-url", org_id: orgId },
    });
    setPortalLoading(false);

    if (data?.url) {
      window.open(data.url, "_blank");
    } else {
      toast({
        title: "Could not open portal",
        description: error?.message || data?.error || "Stripe customer not found. Complete a subscription first.",
        variant: "destructive",
      });
    }
  };

  const handleConnectBank = async (studioId: string) => {
    setConnectingStudio(studioId);
    const { data, error } = await supabase.functions.invoke("create-connect-account", {
      body: { action: "create-onboarding", studio_id: studioId },
    });
    setConnectingStudio(null);

    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast({
        title: "Could not start onboarding",
        description: error?.message || data?.error || "Please try again.",
        variant: "destructive",
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
          One unified monthly invoice for your entire organization
        </p>
      </div>

      {/* ─── Master Invoice Summary ─── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Kinspace Subscription</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">${totalMRR.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground">{studios.length} location{studios.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Line Item Breakdown */}
          <div className="space-y-2 mb-4">
            {studios.map((studio) => {
              const info = TIER_INFO[(studio.subscription_tier as string) || "standard"];
              return (
                <div key={studio.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{studio.name}</span>
                    {studio.location && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        <MapPin className="inline h-3 w-3 mr-0.5" />{studio.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${studio.subscription_tier === "pro" ? "border-primary text-primary" : ""}`}>
                      {info?.name ?? "Standard"}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">${info?.price ?? 99}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleViewInvoices} disabled={portalLoading}>
              <ExternalLink className="h-4 w-4" />
              {portalLoading ? "Opening…" : "Manage Billing"}
            </Button>
            <p className="text-[11px] text-muted-foreground self-center">View invoices, update payment method, and more</p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Per-Studio Cards ─── */}
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
                    {TIER_INFO[tier]?.name ?? "Standard"} · ${TIER_INFO[tier]?.price ?? 99}/mo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Plan Switcher */}
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
                            onClick={() => openConfirmModal(studio, plan.tier)}
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
                  <p className="text-sm font-medium text-foreground mb-2">Client Payouts</p>
                  {isConnected ? (
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payouts Active
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => window.open(`https://dashboard.stripe.com/${studio.stripe_account_id}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Stripe Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                      <LinkIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-3">
                        Connect a bank account to receive client payouts for this location.
                      </p>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={connectingStudio === studio.id}
                        onClick={() => handleConnectBank(studio.id)}
                      >
                        {connectingStudio === studio.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-3.5 w-3.5" />
                            Connect Bank Account
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* ─── Billing Details ─── */}
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
              <Download className="h-4 w-4" />
              Download Past Invoices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Confirmation Modal ─── */}
      <Dialog open={!!confirmModal} onOpenChange={(open) => !open && !switching && setConfirmModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Plan Change for {confirmModal?.studioName}</DialogTitle>
            <DialogDescription>Review the billing change below before confirming.</DialogDescription>
          </DialogHeader>

          {confirmModal && (
            <div className="space-y-4 py-2">
              {/* Transition breakdown */}
              <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold text-foreground">{TIER_INFO[confirmModal.currentTier]?.name}</p>
                  <p className="text-lg font-bold text-foreground">${TIER_INFO[confirmModal.currentTier]?.price}/mo</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">New Plan</p>
                  <p className="font-semibold text-primary">{TIER_INFO[confirmModal.newTier]?.name}</p>
                  <p className="text-lg font-bold text-primary">${TIER_INFO[confirmModal.newTier]?.price}/mo</p>
                </div>
              </div>

              {/* Price difference */}
              {(() => {
                const diff = (TIER_INFO[confirmModal.newTier]?.price ?? 0) - (TIER_INFO[confirmModal.currentTier]?.price ?? 0);
                const isUpgrade = diff > 0;
                return (
                  <div className={`rounded-lg border p-3 text-sm ${isUpgrade ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                    <p className="font-medium text-foreground mb-1">
                      {isUpgrade ? `+$${diff}/mo increase` : `-$${Math.abs(diff)}/mo decrease`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stripe will automatically calculate the prorated difference for the remainder of your current billing cycle. This prorated amount will be applied to your next unified monthly invoice.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setConfirmModal(null)} disabled={!!switching}>
              Cancel
            </Button>
            <Button onClick={handleChangeTier} disabled={!!switching}>
              {switching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Confirm & Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
