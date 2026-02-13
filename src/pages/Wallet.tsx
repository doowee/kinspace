import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, ExternalLink, ShoppingBag, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface StudioPass {
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  credits_remaining: number;
}

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  payment_method: string;
  status: string;
  created_at: string;
  studio_name: string;
}

export default function Wallet() {
  const { user } = useAuth();
  const [passes, setPasses] = useState<StudioPass[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [creditsRes, txRes] = await Promise.all([
      supabase
        .from("student_passes")
        .select("credits_remaining, studio_id, studios:studio_id(name, slug)")
        .eq("user_id", user.id)
        .gt("credits_remaining", 0)
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("transactions")
        .select("id, amount, description, payment_method, status, created_at, studios:studio_id(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // Group passes by studio
    const passMap: Record<string, StudioPass> = {};
    (creditsRes.data ?? []).forEach((p: any) => {
      const sid = p.studio_id;
      if (!passMap[sid]) {
        passMap[sid] = {
          studio_id: sid,
          studio_name: (p.studios as any)?.name ?? "Unknown",
          studio_slug: (p.studios as any)?.slug ?? "",
          credits_remaining: 0,
        };
      }
      passMap[sid].credits_remaining += p.credits_remaining;
    });
    setPasses(Object.values(passMap));

    setTransactions(
      (txRes.data ?? []).map((t: any) => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        payment_method: t.payment_method,
        status: t.status,
        created_at: t.created_at,
        studio_name: (t.studios as any)?.name ?? "",
      }))
    );

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-7 w-7" />
          My Passes
        </h2>
        <p className="mt-1 text-muted-foreground">Your active credits and transaction history.</p>
      </div>

      {/* Active Passes */}
      {passes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No active passes. Purchase a package to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {passes.map((sp) => (
            <Card key={sp.studio_id} className="relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary/30" />
              <CardHeader className="pb-2 pl-5">
                <CardTitle className="text-sm font-medium font-sans truncate">{sp.studio_name}</CardTitle>
              </CardHeader>
              <CardContent className="pl-5 flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-bold font-display ${sp.credits_remaining > 0 ? "text-primary" : "text-destructive"}`}>
                    {sp.credits_remaining}
                  </div>
                  <p className="text-xs text-muted-foreground">credits remaining</p>
                </div>
                {sp.studio_slug && (
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" size="sm" asChild className="text-xs gap-1">
                      <Link to={`/book/${sp.studio_slug}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Book
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                      <Link to={`/packages/${sp.studio_slug}`}>
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Buy More
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
          ) : (
            <div className="divide-y">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-sm truncate">{t.description || "Payment"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.studio_name && <span>{t.studio_name} · </span>}
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-medium text-sm">${(t.amount / 100).toFixed(2)}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {t.payment_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
