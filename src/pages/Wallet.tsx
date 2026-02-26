import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, Receipt } from "lucide-react";
import { format } from "date-fns";

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
  const [classPoints, setClassPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, txRes] = await Promise.all([
      supabase.from("profiles").select("class_points").eq("id", user.id).single(),
      supabase
        .from("transactions")
        .select("id, amount, description, payment_method, status, created_at, studios:studio_id(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setClassPoints(profileRes.data?.class_points ?? 0);

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

  useEffect(() => { fetchData(); }, [fetchData]);

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
          My Wallet
        </h2>
        <p className="mt-1 text-muted-foreground">Your class points and transaction history.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Class Points</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold font-display ${classPoints > 0 ? "text-primary" : "text-destructive"}`}>
            {classPoints}
          </div>
          <p className="text-xs text-muted-foreground mt-1">points available</p>
        </CardContent>
      </Card>

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
                    <p className="font-medium text-sm">${t.amount}</p>
                    <Badge variant="outline" className="text-[10px]">{t.payment_method}</Badge>
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
