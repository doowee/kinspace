import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Plus } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import RecordPaymentModal from "@/components/finance/RecordPaymentModal";

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  description: string | null;
  payment_method: string;
  status: string;
  user_id: string;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
}

export default function Finance() {
  const { activeStudio } = useStudio();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const studioId = activeStudio?.id;

  const fetchData = useCallback(async () => {
    if (!studioId) return;
    setLoading(true);

    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [txRes, memberRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, created_at, description, payment_method, status, user_id, profiles ( first_name, last_name, email )")
        .eq("studio_id", studioId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("studio_members")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", studioId),
    ]);

    if (txRes.data) setTransactions(txRes.data as unknown as Transaction[]);
    setMemberCount(memberRes.count ?? 0);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Aggregate daily revenue for chart
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[key] = 0;
    }
    transactions
      .filter((t) => t.status === "completed")
      .forEach((t) => {
        const key = format(new Date(t.created_at), "yyyy-MM-dd");
        if (key in days) {
          days[key] += Number(t.amount);
        }
      });
    return Object.entries(days).map(([date, revenue]) => ({
      date: format(new Date(date), "MMM d"),
      revenue: Math.round(revenue * 100) / 100,
    }));
  }, [transactions]);

  const totalRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  if (!studioId) {
    return <p className="text-muted-foreground py-20 text-center">Select a studio first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Finance</h2>
          <p className="text-sm text-muted-foreground">Last 30 days overview</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Record Offline Payment
        </Button>
      </div>

      {/* Top Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (This Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "…" : memberCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground animate-pulse">
              Loading chart…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const studentName = t.profiles
                  ? [t.profiles.first_name, t.profiles.last_name].filter(Boolean).join(" ") || t.profiles.email
                  : "—";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{studentName}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
                    <TableCell className="capitalize">{t.payment_method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "completed" ? "default" : t.status === "refunded" ? "secondary" : "destructive"}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                );
              })}
              {transactions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecordPaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        studioId={studioId}
        onSuccess={fetchData}
      />
    </div>
  );
}
