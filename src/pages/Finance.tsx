import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Plus, TrendingUp, Activity, CheckCircle2, BarChart3 } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/*  Premium Demo Defaults                                              */
/* ------------------------------------------------------------------ */

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "d1", amount: 199, created_at: new Date(Date.now() - 60_000).toISOString(), description: "10-Class Pack Refill (SMS)", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "Jessica", last_name: "T.", email: "jessica@demo.com" } },
  { id: "d2", amount: 35, created_at: new Date(Date.now() - 600_000).toISOString(), description: "Drop-in Rate (Waitlist Auto-Charge)", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "Mark", last_name: "S.", email: "mark@demo.com" } },
  { id: "d3", amount: 249, created_at: new Date(Date.now() - 3_600_000).toISOString(), description: "Unlimited Monthly VIP", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "Amanda", last_name: "R.", email: "amanda@demo.com" } },
  { id: "d4", amount: 125, created_at: new Date(Date.now() - 7_200_000).toISOString(), description: "5-Class Intro Pack", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "David", last_name: "K.", email: "david@demo.com" } },
  { id: "d5", amount: 95, created_at: new Date(Date.now() - 10_800_000).toISOString(), description: "Private Session (1-on-1)", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "Sophia", last_name: "L.", email: "sophia@demo.com" } },
  { id: "d6", amount: 199, created_at: new Date(Date.now() - 86_400_000).toISOString(), description: "10-Class Pack", payment_method: "card", status: "completed", user_id: "", profiles: { first_name: "Priya", last_name: "P.", email: "priya@demo.com" } },
  { id: "d7", amount: 249, created_at: new Date(Date.now() - 172_800_000).toISOString(), description: "Unlimited Monthly VIP", payment_method: "transfer", status: "completed", user_id: "", profiles: { first_name: "Marcus", last_name: "L.", email: "marcus@demo.com" } },
  { id: "d8", amount: 35, created_at: new Date(Date.now() - 259_200_000).toISOString(), description: "Drop-in", payment_method: "cash", status: "completed", user_id: "", profiles: { first_name: "Elena", last_name: "V.", email: "elena@demo.com" } },
];

function generateDemoChart() {
  // Generate a realistic 30-day revenue curve averaging ~$1,400/day ($42,500/mo)
  const data: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dayOfWeek = d.getDay();
    // Weekdays higher, weekends slightly lower
    const base = dayOfWeek === 0 || dayOfWeek === 6 ? 900 : 1600;
    const variance = Math.random() * 600 - 300;
    data.push({
      date: format(d, "MMM d"),
      revenue: Math.round(base + variance),
    });
  }
  return data;
}

const DEMO_CHART = generateDemoChart();
const DEMO_TOTAL_REVENUE = 42_500;
const DEMO_MEMBER_COUNT = 214;

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function Finance() {
  const { activeStudio } = useStudio();
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const [realMemberCount, setRealMemberCount] = useState(0);
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

    if (txRes.data) setRealTransactions(txRes.data as unknown as Transaction[]);
    setRealMemberCount(memberRes.count ?? 0);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Use real data if available, otherwise fall back to demo data
  const hasRealData = realTransactions.length > 0;
  const transactions = hasRealData ? realTransactions : DEMO_TRANSACTIONS;

  const chartData = useMemo(() => {
    if (!hasRealData) return DEMO_CHART;
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[key] = 0;
    }
    realTransactions
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
  }, [realTransactions, hasRealData]);

  const totalRevenue = useMemo(() => {
    if (!hasRealData) return DEMO_TOTAL_REVENUE;
    return realTransactions
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + Number(t.amount), 0);
  }, [realTransactions, hasRealData]);

  const memberCount = hasRealData ? realMemberCount : DEMO_MEMBER_COUNT;

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                {loading && hasRealData ? "…" : `$${totalRevenue.toLocaleString()}`}
              </p>
            </div>
            <Badge variant="outline" className="gap-1 text-success border-success/30">
              <TrendingUp className="h-3 w-3" />
              12.4%
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">YTD Revenue</p>
              <p className="text-2xl font-bold text-foreground">$184,200</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Active Members</p>
              <p className="text-2xl font-bold text-foreground">{loading && hasRealData ? "…" : memberCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">ARPU</p>
              <p className="text-2xl font-bold text-foreground">$198</p>
            </div>
            <Badge variant="outline" className="gap-1 text-success border-success/30">
              <TrendingUp className="h-3 w-3" />
              4.2%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && hasRealData ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground animate-pulse">
              Loading chart…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Live Transaction Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle>Recent Transactions</CardTitle>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {transactions.map((t) => {
              const studentName = t.profiles
                ? [t.profiles.first_name, t.profiles.last_name].filter(Boolean).join(" ") || t.profiles.email
                : "—";
              return (
                <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.description ?? "Payment"}</p>
                    <p className="text-xs text-muted-foreground">{studentName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{relativeTime(t.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && !loading && (
              <p className="py-4 text-center text-sm text-muted-foreground">No transactions yet.</p>
            )}
          </div>
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
