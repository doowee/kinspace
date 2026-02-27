import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrgDashboardData, OrgDashboardData } from "@/lib/studio-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Users, CalendarCheck, Building2, TrendingUp, ArrowUpRight, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatDistanceToNow, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--sage))",
  "hsl(var(--secondary))",
];

type Timeframe = "week" | "month" | "year" | "all";

function getDateSince(tf: Timeframe): string | undefined {
  const now = new Date();
  switch (tf) {
    case "week":
      return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case "month":
      return startOfMonth(now).toISOString();
    case "year":
      return startOfYear(now).toISOString();
    case "all":
      return undefined;
  }
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

export default function OrgRevenue() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("month");

  // 1. Fetch org from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()
      .then(({ data: profile }) => {
        if (profile?.organization_id) {
          setOrgId(profile.organization_id);
          supabase
            .from("organizations")
            .select("name")
            .eq("id", profile.organization_id)
            .single()
            .then(({ data: org }) => setOrgName(org?.name ?? "Organization"));
        } else {
          setLoading(false);
        }
      });
  }, [user]);

  // 2. Fetch data whenever org or filters change
  const fetchData = useCallback(async () => {
    if (!orgId) return;
    setRefreshing(true);
    const since = getDateSince(selectedTimeframe);
    const d = await fetchOrgDashboardData(orgId, {
      studioId: selectedLocation === "all" ? null : selectedLocation,
      since,
    });
    setData(d);
    setLoading(false);
    setRefreshing(false);
  }, [orgId, selectedLocation, selectedTimeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isSingleStudio = selectedLocation !== "all";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Your profile is not linked to an organization yet.</p>
      </div>
    );
  }

  if (!data) return null;

  const { globalRevenue, totalClients, totalBookings, studioBreakdowns, networkFeed, studios } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{orgName}</h2>
        <p className="text-sm text-muted-foreground">
          Enterprise dashboard — {TIMEFRAME_LABELS[selectedTimeframe].toLowerCase()}
          {isSingleStudio
            ? ` · ${studios.find((s) => s.id === selectedLocation)?.name ?? ""}`
            : " · all locations"}
        </p>
      </div>

      {/* ═══ GLOBAL FILTER BAR ═══ */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {studios.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as Timeframe)}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {refreshing && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
      </div>

      {/* ═══ TOP STATS ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title={isSingleStudio ? "Studio Revenue" : "Global Revenue"}
          value={`$${globalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title={isSingleStudio ? "Studio Clients" : "Network Clients"}
          value={totalClients.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          title={isSingleStudio ? "Studio Bookings" : "Total Bookings"}
          value={totalBookings.toLocaleString()}
          icon={<CalendarCheck className="h-4 w-4" />}
        />
      </div>

      {/* ═══ BOTTOM STATS ═══ */}
      <div className={`grid gap-6 ${isSingleStudio ? "" : "lg:grid-cols-5"}`}>
        {/* Left: Location Leaderboard (only when viewing all) */}
        {!isSingleStudio && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Location Leaderboard
              </CardTitle>
              <CardDescription>Revenue &amp; client contribution by studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {studioBreakdowns.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studioBreakdowns} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={120} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(v: number) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue"]}
                        contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                        {studioBreakdowns.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-3">
                {studioBreakdowns.map((s, i) => {
                  const revenueShare = globalRevenue > 0 ? Math.round((s.revenue / globalRevenue) * 100) : 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                        <div>
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.location ?? "No location"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            ${s.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">{revenueShare}% of total</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.clients}</p>
                          <p className="text-xs text-muted-foreground">clients</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.bookings}</p>
                          <p className="text-xs text-muted-foreground">bookings</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {studioBreakdowns.length === 0 && (
                  <p className="py-6 text-center text-muted-foreground">No studios linked to this organization.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Right (or full-width when single studio): Live Network Feed */}
        <Card className={isSingleStudio ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              {isSingleStudio ? "Activity Feed" : "Live Network Feed"}
            </CardTitle>
            <CardDescription>
              {isSingleStudio
                ? `Recent activity for ${studios.find((s) => s.id === selectedLocation)?.name ?? "this studio"}`
                : "Recent activity across all locations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`space-y-2 overflow-y-auto pr-1 ${isSingleStudio ? "max-h-[600px]" : "max-h-[420px]"}`}>
              {networkFeed.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.type === "transaction" ? (
                        <>
                          <span className="text-success">+${item.amount.toFixed(2)}</span>
                          {" — "}
                          {item.description}
                        </>
                      ) : (
                        <>📅 {item.description}</>
                      )}
                    </p>
                    {item.studentName && (
                      <p className="text-xs text-muted-foreground truncate">{item.studentName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    🏢 {item.studioName.split(" ")[0]}
                  </Badge>
                </div>
              ))}
              {networkFeed.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No activity in this period.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── KPI Card Component ── */
function KpiCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
