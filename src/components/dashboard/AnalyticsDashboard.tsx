import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudio } from "@/contexts/StudioContext";
import { useViewAsRole } from "@/components/AppLayout";
import { fetchDashboardData } from "@/lib/studio-api";
import type { DashboardData } from "@/lib/studio-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Crown,
  AlertTriangle,
  Search,
  CalendarDays,
  UserCheck,
  Clock,
  CheckCircle2,
  ArrowRightLeft,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DATE_RANGE_DAYS: Record<string, number> = {
  today: 1,
  week: 7,
  month: 30,
  ytd: 365,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AnalyticsDashboard({ onNavigateToMarketing }: { onNavigateToMarketing?: () => void }) {
  const { activeStudio } = useStudio();
  const viewAsRole = useViewAsRole();
  const [dateRange, setDateRange] = useState("month");
  const [instructor, setInstructor] = useState("all");
  const [chartGranularity, setChartGranularity] = useState("week");
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const studioId = activeStudio?.id;
  const days = DATE_RANGE_DAYS[dateRange] ?? 30;
  const isOwner = viewAsRole === "owner";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", studioId, days],
    queryFn: () => fetchDashboardData(studioId!, days),
    enabled: !!studioId,
  });

  /* ── Filtered views ── */
  const allInstructors = data?.topInstructors ?? [];
  const filteredInstructors =
    instructor === "all"
      ? allInstructors
      : allInstructors.filter((i) => i.name === instructor);
  const filteredClasses =
    instructor === "all"
      ? (data?.topClasses ?? [])
      : (data?.topClasses ?? []).filter((c) => c.instructor === instructor);
  const filteredRisks =
    instructor === "all"
      ? (data?.capacityRisks ?? [])
      : (data?.capacityRisks ?? []).filter((r) => r.instructor === instructor);

  /* ── Chart data with granularity ── */
  const chartData = useMemo(() => {
    const daily = data?.revenueByDay ?? [];
    if (!daily.length) return [];
    if (chartGranularity === "day") return daily.map((d) => ({ label: d.date, revenue: d.revenue }));
    if (chartGranularity === "week") {
      const weeks: { label: string; revenue: number }[] = [];
      for (let i = 0; i < daily.length; i += 7) {
        const slice = daily.slice(i, i + 7);
        weeks.push({
          label: `W${Math.floor(i / 7) + 1}`,
          revenue: Math.round(slice.reduce((s, d) => s + d.revenue, 0)),
        });
      }
      return weeks;
    }
    // quarter
    const quarters: { label: string; revenue: number }[] = [];
    for (let i = 0; i < daily.length; i += 90) {
      const slice = daily.slice(i, i + 90);
      quarters.push({
        label: `Q${Math.floor(i / 90) + 1}`,
        revenue: Math.round(slice.reduce((s, d) => s + d.revenue, 0)),
      });
    }
    return quarters;
  }, [data?.revenueByDay, chartGranularity]);

  /* ── Mock AI search ── */
  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiLoading(false);
      const rev = data?.totalRevenue ?? 0;
      const top = data?.topInstructors?.[0];
      setAiResponse(
        top
          ? `Your total revenue this period is $${rev.toLocaleString()}. ${top.name} is your top instructor, generating $${top.revenue.toLocaleString()} across ${top.classes} classes at ${top.capacity}% average capacity.`
          : `Your total revenue this period is $${rev.toLocaleString()}. Seed demo data to see instructor-level insights.`
      );
    }, 1200);
  };

  if (isLoading) return <DashboardSkeleton />;

  const d = data!;

  return (
    <div className="space-y-6">
      {/* ── AI Data Analyst Bar (Owner only) ───────────────── */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOwner ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                placeholder="Ask your data… (e.g., 'Who is my top instructor?')"
                className="pl-10 pr-12 h-12 text-sm bg-background"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                onClick={handleAiSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {aiLoading && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {aiResponse && !aiLoading && (
              <div className="flex gap-3 rounded-xl border bg-muted/30 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-foreground">{aiResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SmartCover Notification (Owner only) ───────────── */}
      {isOwner && allInstructors.length >= 2 && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">SmartCover Alert</p>
            <p className="text-xs text-muted-foreground">
              {allInstructors[0].name} just picked up {allInstructors[1].name}'s Thursday 6:00 AM class. Public schedule updated.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
            Just now
          </Badge>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
        <Select value={instructor} onValueChange={setInstructor}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instructors</SelectItem>
            {allInstructors.map((inst) => (
              <SelectItem key={inst.name} value={inst.name}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Topline KPIs ────────────────────────────────────── */}
      <div
        className={`grid gap-4 transition-all duration-300 ease-in-out ${
          isOwner ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-3"
        }`}
      >
        {isOwner ? (
          <>
            <KPICard
              label="Total Revenue"
              value={`$${d.totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KPICard
              label="MRR"
              value="$28,450"
              icon={<TrendingUp className="h-4 w-4" />}
              badge="+4.2%"
            />
            <KPICard
              label="Active Memberships"
              value="142"
              icon={<UserCheck className="h-4 w-4" />}
            />
            <KPICard
              label="Avg Capacity"
              value={`${d.avgCapacity}%`}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <KPICard
              label="Active Members"
              value={d.memberCount.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
            />
            <KPICard
              label="ARPU"
              value={`$${d.arpu.toLocaleString()}`}
              icon={<Activity className="h-4 w-4" />}
            />
          </>
        ) : (
          <>
            <KPICard
              label="Classes Today"
              value={String(d.classesToday)}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <KPICard
              label="Check-ins Expected"
              value={String(d.checkInsExpected)}
              icon={<UserCheck className="h-4 w-4" />}
            />
            <KPICard
              label="Waitlist Pending"
              value={String(d.waitlistPending)}
              icon={<Clock className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {/* ── Revenue Chart (Owner only) ─────────────────────── */}
      {isOwner && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Revenue</CardTitle>
              <div className="flex gap-1">
                {(["day", "week", "quarter"] as const).map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={chartGranularity === g ? "default" : "outline"}
                    className="h-7 text-xs capitalize"
                    onClick={() => setChartGranularity(g)}
                  >
                    {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Quarterly"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                    className="text-muted-foreground"
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="url(#revGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Transactions (Owner only) ────────────────── */}
      {isOwner && d.recentTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {d.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.studentName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Leaderboards ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3 transition-all duration-300 ease-in-out">
        {/* Top Instructors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top {Math.min(filteredInstructors.length, 5)} Instructors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {filteredInstructors.slice(0, 5).map((inst, i) => (
              <div key={inst.name} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {inst.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {i === 0 && <Crown className="mr-1 inline h-3.5 w-3.5 text-highlight" />}
                    {inst.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inst.classes} classes · {inst.capacity}% capacity
                  </p>
                </div>
                {isOwner && (
                  <span className="text-sm font-semibold text-foreground">
                    ${inst.revenue.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
            {filteredInstructors.length === 0 && (
              <p className="text-sm text-muted-foreground">No instructor data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Classes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top {Math.min(filteredClasses.length, 5)} Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {filteredClasses.slice(0, 5).map((cls, i) => (
              <div key={cls.name + i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cls.name}</p>
                  <p className="text-xs text-muted-foreground">{cls.instructor}</p>
                </div>
                {isOwner && (
                  <span className="text-sm font-semibold text-foreground">
                    ${cls.revenue.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
            {filteredClasses.length === 0 && (
              <p className="text-sm text-muted-foreground">No class data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top {Math.min((data?.topStudents ?? []).length, 5)} Students
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {(data?.topStudents ?? []).slice(0, 5).map((stu, i) => (
              <div key={stu.name + i} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {stu.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {i === 0 && <Crown className="mr-1 inline h-3.5 w-3.5 text-highlight" />}
                    {stu.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{stu.attended} classes</p>
                </div>
                {isOwner && (
                  <span className="text-sm font-semibold text-foreground">
                    ${stu.ltv.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
            {(data?.topStudents ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No student data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom: Capacity Risks / Upcoming Classes ──────── */}
      <div className="transition-all duration-300 ease-in-out">
        {isOwner ? (
          filteredRisks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-base">Capacity Risks & Utilization</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {filteredRisks.map((risk) => {
                  const isDanger = risk.capacity < 50;
                  return (
                    <div
                      key={risk.className + risk.day}
                      className={`flex items-center gap-4 rounded-lg border p-3 ${
                        isDanger ? "border-destructive/40 bg-destructive/5" : "bg-card"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {risk.instructor} — {risk.day} {risk.time} {risk.className}
                        </p>
                      </div>
                      <Badge variant={isDanger ? "destructive" : "outline"} className="shrink-0">
                        {risk.capacity}%
                      </Badge>
                      {isDanger && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs"
                          onClick={() => onNavigateToMarketing?.()}
                        >
                          <Sparkles className="h-3 w-3" />
                          Deploy Marketing Agent
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )
        ) : (
          d.upcomingClasses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Upcoming Classes Today</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {d.upcomingClasses.map((cls) => (
                  <div
                    key={cls.name + cls.time}
                    className="flex items-center gap-4 rounded-lg border bg-card p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.time} · {cls.instructor}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {cls.checkedIn}/{cls.capacity}
                      </Badge>
                      {cls.checkedIn > 0 && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KPICard({ label, value, icon, badge }: { label: string; value: string; icon: React.ReactNode; badge?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {badge && (
              <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-semibold px-1.5 py-0.5">
                {badge}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
