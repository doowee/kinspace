import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PACKS = [
  {
    id: "drop_in",
    name: "Drop-In",
    credits: 1,
    price: 25,
    description: "Perfect for trying a single class",
    highlight: false,
  },
  {
    id: "5_pack",
    name: "5-Class Pack",
    credits: 5,
    price: 100,
    description: "Best for regular weekly attendance",
    highlight: true,
    savings: "Save $25",
  },
  {
    id: "10_pack",
    name: "10-Class Pack",
    credits: 10,
    price: 175,
    description: "Maximum value for committed students",
    highlight: false,
    savings: "Save $75",
  },
];

export default function Credits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [classPoints, setClassPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  // Show success banner
  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (paymentStatus === "success") {
      toast({
        title: "Payment successful!",
        description: "Your credits have been added to your account.",
      });
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (!user) return;
    const fetchPoints = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("class_points")
        .eq("id", user.id)
        .single();
      setClassPoints(data?.class_points ?? 0);
      setLoading(false);
    };
    fetchPoints();
  }, [user?.id, paymentStatus]);

  const handleBuy = async (packId: string) => {
    setBuyingPack(packId);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-checkout", {
        body: { pack: packId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
      setBuyingPack(null);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-7 w-7" />
          Buy Credits
        </h2>
        <p className="mt-1 text-muted-foreground">
          Purchase class credits to book sessions at any studio.
        </p>
      </div>

      {/* Success Banner */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-sm opacity-80">Your credits have been added to your wallet.</p>
          </div>
        </div>
      )}

      {/* Current Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold font-display ${classPoints > 0 ? "text-primary" : "text-destructive"}`}>
            {loading ? "—" : classPoints}
          </div>
          <p className="text-xs text-muted-foreground mt-1">class credits available</p>
        </CardContent>
      </Card>

      {/* Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PACKS.map((pack) => (
          <Card
            key={pack.id}
            className={pack.highlight ? "ring-2 ring-primary shadow-lg relative" : "relative"}
          >
            {pack.highlight && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                <Sparkles className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2 pt-6">
              <CardTitle className="font-display text-lg">{pack.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <span className="text-4xl font-bold font-display text-foreground">${pack.price}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {pack.credits} credit{pack.credits > 1 ? "s" : ""}
                  {pack.credits > 1 && ` · $${(pack.price / pack.credits).toFixed(0)}/class`}
                </p>
                {pack.savings && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {pack.savings}
                  </Badge>
                )}
              </div>
              <Button
                className="w-full"
                variant={pack.highlight ? "default" : "outline"}
                disabled={!!buyingPack}
                onClick={() => handleBuy(pack.id)}
              >
                {buyingPack === pack.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Buy Now"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
