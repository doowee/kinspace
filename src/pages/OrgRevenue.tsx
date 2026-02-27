import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOrgDashboardData, OrgDashboardData } from "@/lib/studio-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Users, CalendarCheck, Building2, TrendingUp, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, formatDistanceToNow } from "date-fns";

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--sage))",
  "hsl(var(--secondary))",
];

export default function OrgRevenue() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch org from the user's profile
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
          // Fetch org name
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

  // 2. Fetch aggregated data
  useEffect(() => {
    if (!orgId) return;
    fetchOrgDashboardData(orgId).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [orgId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="lg:col-span-3 h-72 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        </div>
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

  const { globalRevenue, totalClients, totalBookings, studioBreakdowns, networkFeed } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">{orgName}</h2>
        <p className="text-sm text-muted-foreground">
          Enterprise dashboard — last 30 days across all locations
        </p>
      </div>

      {/* ═══ TOP STATS ═══ */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Global Revenue"
          value={`$${globalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="h-4 w-4" />}
          trend="+12% this month"
        />
        <KpiCard
          title="Network Clients"
          value={totalClients.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          trend="+8% this month"
        />
        <KpiCard
          title="Total Bookings"
          value={totalBookings.toLocaleString()}
          icon={<CalendarCheck className="h-4 w-4" />}
          trend="+15% this month"
        />
      </div>

      {/* ═══ BOTTOM STATS ═══ */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Location Leaderboard */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Location Leaderboard
            </CardTitle>
            <CardDescription>Revenue & client contribution by studio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bar Chart */}
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

            {/* Detail rows */}
            <div className="space-y-3">
              {studioBreakdowns.map((s, i) => {
                const revenueShare = globalRevenue > 0 ? Math.round((s.revenue / globalRevenue) * 100) : 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
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

        {/* Right: Live Network Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Live Network Feed
            </CardTitle>
            <CardDescription>Recent activity across all locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {networkFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-3"
                >
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
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No recent activity yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── KPI Card Component ── */
function KpiCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
          <ArrowUpRight className="h-3 w-3" />
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
