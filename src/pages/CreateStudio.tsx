import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { createStudioWithMembership } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, Sparkles, Zap } from "lucide-react";
import { Navigate } from "react-router-dom";
import type { SubscriptionTier } from "@/hooks/use-subscription-tier";

const PLANS = [
  {
    tier: "standard" as SubscriptionTier,
    name: "Standard",
    price: "$129",
    features: ["Unlimited classes & bookings", "Multi-location management", "Stripe payments", "Client portal & wallet"],
  },
  {
    tier: "pro" as SubscriptionTier,
    name: "Pro Engine",
    price: "$169",
    badge: "Recommended",
    features: ["Everything in Standard", "AI Revenue Agent", "1-Tap SMS Flash Drops", "Advanced BI insights"],
  },
];

export default function CreateStudio() {
  const { user } = useAuth();
  const { refetch, memberships, setActiveStudioId } = useStudio();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth" replace />;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Find the org ID from an existing owned studio
  const ownerMembership = memberships.find((m) => m.role === "owner");
  const orgId = (ownerMembership?.studios as any)?.organization_id ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);

    try {
      const studioId = await createStudioWithMembership(name, slug, location || undefined);

      // Update studio tier
      await supabase
        .from("studios")
        .update({ subscription_tier: selectedTier } as any)
        .eq("id", studioId);

      // If we have an org, add as subscription item via edge function
      if (orgId) {
        const { data, error } = await supabase.functions.invoke("manage-subscription", {
          body: { action: "add-location", org_id: orgId, studio_id: studioId, tier: selectedTier },
        });
        if (error) console.warn("Stripe subscription update skipped:", error.message);
        if (data?.error) console.warn("Stripe subscription update skipped:", data.error);
      }

      // Set new studio as active before refetching
      setActiveStudioId(studioId);
      await refetch();
      toast({ title: "Location added!", description: `${name} is ready to go. Prorated charges will appear on your next invoice.` });
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
            <Building2 className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Add Another Location
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose a plan for this location. Prorated charges apply mid-cycle.
          </p>
        </div>

        {/* Tier Selection */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {PLANS.map((plan) => {
            const isSelected = selectedTier === plan.tier;
            return (
              <div
                key={plan.tier}
                onClick={() => setSelectedTier(plan.tier)}
                className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    {plan.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-1">
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
                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-foreground">
                      <Check className="h-2.5 w-2.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Studio Details</CardTitle>
            <CardDescription>
              This location will be added to your existing subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Studio Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zen Pilates — Midtown"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, New York"
                />
              </div>
              {slug && (
                <p className="text-sm text-muted-foreground">
                  URL slug: <span className="font-mono text-foreground">{slug}</span>
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || !slug}>
                {loading ? "Adding location..." : `Add Location · ${PLANS.find((p) => p.tier === selectedTier)?.price}/mo`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
