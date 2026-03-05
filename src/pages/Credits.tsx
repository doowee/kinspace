import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Sparkles, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  product_type: string;
  point_value: number | null;
  description?: string;
  stripe_price_id: string | null;
}

export default function Credits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [classPoints, setClassPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [buyingProduct, setBuyingProduct] = useState<string | null>(null);

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (paymentStatus === "success") {
      toast({
        title: "Payment successful!",
        description: "Your credits have been added to your account.",
      });
    }
  }, [paymentStatus]);

  // Fetch balance + products
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);

      // Fetch balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("class_points, home_studio_id")
        .eq("id", user.id)
        .single();

      setClassPoints(profile?.class_points ?? 0);

      // Fetch active products — public RLS policy allows viewing active products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, product_type, point_value, stripe_price_id")
        .eq("is_active", true)
        .order("price", { ascending: true });

      setProducts((prods as Product[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user?.id, paymentStatus]);

  const handleBuy = async (productId: string) => {
    setBuyingProduct(productId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { productId },
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
      setBuyingProduct(null);
    }
  };

  const packs = products.filter((p) => p.product_type === "pack");
  const subscriptions = products.filter((p) => p.product_type === "subscription");

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-7 w-7" />
          Buy Credits
        </h2>
        <p className="mt-1 text-muted-foreground">
          Purchase class credits or subscribe for unlimited access.
        </p>
      </div>

      {/* Success Banner */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-sm opacity-80">Your account has been updated.</p>
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Subscriptions */}
          {subscriptions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Monthly Subscriptions
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {subscriptions.map((product) => (
                  <Card key={product.id} className="relative ring-2 ring-primary shadow-lg">
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Unlimited
                    </Badge>
                    <CardHeader className="text-center pb-2 pt-6">
                      <CardTitle className="font-display text-lg">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div>
                        <span className="text-4xl font-bold font-display text-foreground">
                          ${product.price}
                        </span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!!buyingProduct}
                        onClick={() => handleBuy(product.id)}
                      >
                        {buyingProduct === product.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          "Subscribe"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Class Packs */}
          {packs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Class Packs
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {packs.map((product, idx) => {
                  const isMiddle = packs.length === 3 && idx === 1;
                  return (
                    <Card
                      key={product.id}
                      className={isMiddle ? "ring-2 ring-primary shadow-lg relative" : "relative"}
                    >
                      {isMiddle && (
                        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      )}
                      <CardHeader className="text-center pb-2 pt-6">
                        <CardTitle className="font-display text-lg">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <div>
                          <span className="text-4xl font-bold font-display text-foreground">
                            ${product.price}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {product.point_value ?? 0} credit{(product.point_value ?? 0) > 1 ? "s" : ""}
                            {(product.point_value ?? 0) > 1 &&
                              ` · $${(product.price / (product.point_value ?? 1)).toFixed(0)}/class`}
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          variant={isMiddle ? "default" : "outline"}
                          disabled={!!buyingProduct}
                          onClick={() => handleBuy(product.id)}
                        >
                          {buyingProduct === product.id ? (
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
                  );
                })}
              </div>
            </div>
          )}

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No products available yet. Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
