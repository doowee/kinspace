import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createStudioWithMembership } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Check, Sparkles, Zap } from "lucide-react";
import type { SubscriptionTier } from "@/hooks/use-subscription-tier";

const PLANS: { tier: SubscriptionTier; name: string; price: string; description: string; features: string[]; badge?: string }[] = [
  {
    tier: "standard",
    name: "Standard",
    price: "$129",
    description: "Core booking, multi-location management, and frictionless Stripe payments.",
    features: [
      "Unlimited classes & bookings",
      "Multi-location management",
      "Stripe payment processing",
      "Client portal & wallet",
      "Analytics dashboard",
    ],
  },
  {
    tier: "pro",
    name: "Pro Engine",
    price: "$169",
    description: "Everything in Standard, PLUS the autonomous AI Revenue Agent and 1-Tap SMS Flash Drops.",
    badge: "Most Popular",
    features: [
      "Everything in Standard",
      "AI Revenue Agent",
      "1-Tap SMS Flash Drops",
      "Smart Review automation",
      "Advanced BI insights",
    ],
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState<"plan" | "studio">("plan");
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth" replace />;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);

    try {
      const studioId = await createStudioWithMembership(name, slug);

      // Get the studio to find its org, then update tier
      const { data: studio } = await supabase
        .from("studios")
        .select("organization_id")
        .eq("id", studioId)
        .single();

      if (studio?.organization_id) {
        await supabase
          .from("organizations")
          .update({ subscription_tier: selectedTier } as any)
          .eq("id", studio.organization_id);
      }

      toast({ title: "Studio created!", description: `${name} is ready to go.` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome to Kinspace.Studio
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === "plan" ? "Choose the plan that fits your studio." : "Let's create your first studio."}
          </p>
        </div>

        {step === "plan" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((plan) => {
                const isSelected = selectedTier === plan.tier;
                return (
                  <Card
                    key={plan.tier}
                    className={`relative cursor-pointer transition-all hover:shadow-lg ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => setSelectedTier(plan.tier)}
                  >
                    {plan.badge && (
                      <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5">
                        {plan.badge}
                      </Badge>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {plan.tier === "pro" ? (
                          <Sparkles className="h-5 w-5 text-primary" />
                        ) : (
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Button size="lg" className="w-full sm:w-auto px-12" onClick={() => setStep("studio")}>
                Continue with {PLANS.find((p) => p.tier === selectedTier)?.name}
              </Button>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {PLANS.find((p) => p.tier === selectedTier)?.name} · {PLANS.find((p) => p.tier === selectedTier)?.price}/mo
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setStep("plan")}>
                    Change plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Studio Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Downtown Pilates"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Studio Slug</Label>
                    <Input
                      id="slug"
                      value={slug}
                      readOnly
                      className="bg-muted font-mono text-sm"
                      placeholder="auto-generated-from-name"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !slug}>
                    {loading ? "Creating..." : "Create Studio & Enter"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
