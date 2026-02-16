import { useMemo, useState, createContext, useContext } from "react";
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
import { useViewAsRole } from "@/components/AppLayout";
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
/*  Finance Demo Context – allows DemoTriggers to seed data            */
/* ------------------------------------------------------------------ */

interface FinanceDemoState {
  seeded: boolean;
  loading: boolean;
}

const FinanceDemoContext = createContext<{
  state: FinanceDemoState;
  seed: () => void;
}>({
  state: { seeded: false, loading: false },
  seed: () => {},
});

export function useFinanceDemo() {
  return useContext(FinanceDemoContext);
}

export function FinanceDemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FinanceDemoState>({ seeded: false, loading: false });

  const seed = () => {
    setState({ seeded: false, loading: true });
    setTimeout(() => {
      setState({ seeded: true, loading: false });
    }, 1000);
  };

  return (
    <FinanceDemoContext.Provider value={{ state, seed }}>
      {children}
    </FinanceDemoContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Premium Demo Data                                                  */
/* ------------------------------------------------------------------ */

const PREMIUM_INSTRUCTORS = [
  { name: "Sarah Jenkins", initials: "SJ", revenue: 12_400, classes: 64, capacity: 82 },
  { name: "Mike Ross", initials: "MR", revenue: 9_800, classes: 52, capacity: 76 },
  { name: "Emma Stone", initials: "ES", revenue: 8_100, classes: 44, capacity: 91 },
  { name: "Ava Brooks", initials: "AB", revenue: 6_400, classes: 38, capacity: 84 },
  { name: "Liam Torres", initials: "LT", revenue: 5_800, classes: 32, capacity: 79 },
];

const DEFAULT_INSTRUCTORS = [
  { name: "Sarah Kim", initials: "SK", revenue: 4_820, classes: 38, capacity: 78 },
  { name: "Elena Voss", initials: "EV", revenue: 3_950, classes: 31, capacity: 74 },
  { name: "Mike Chen", initials: "MC", revenue: 2_780, classes: 24, capacity: 68 },
  { name: "Ava Brooks", initials: "AB", revenue: 1_540, classes: 14, capacity: 72 },
  { name: "Liam Torres", initials: "LT", revenue: 1_160, classes: 11, capacity: 65 },
];

const PREMIUM_CLASSES = [
  { name: "Morning Reformer Flow", instructor: "Sarah Jenkins", revenue: 5_200 },
  { name: "Power Tower Sculpt", instructor: "Mike Ross", revenue: 4_100 },
  { name: "Advanced Reformer", instructor: "Emma Stone", revenue: 3_800 },
  { name: "Barre Fusion", instructor: "Ava Brooks", revenue: 3_200 },
  { name: "Core Blast Express", instructor: "Liam Torres", revenue: 2_900 },
];

const DEFAULT_CLASSES = [
  { name: "Morning Reformer Flow", instructor: "Sarah Kim", revenue: 3_200 },
  { name: "Mat Pilates Sculpt", instructor: "Elena Voss", revenue: 2_640 },
  { name: "Power Reformer", instructor: "Sarah Kim", revenue: 1_980 },
  { name: "Barre Fusion", instructor: "Ava Brooks", revenue: 1_540 },
  { name: "Sunrise Stretch", instructor: "Liam Torres", revenue: 1_160 },
];

const MOCK_STUDENTS = [
  { name: "Jen Woohoo", initials: "JW", attended: 48, ltv: 2_880 },
  { name: "Priya Patel", initials: "PP", attended: 41, ltv: 2_460 },
  { name: "Marcus Lee", initials: "ML", attended: 36, ltv: 2_160 },
  { name: "Sofia Reyes", initials: "SR", attended: 29, ltv: 1_740 },
  { name: "David Kim", initials: "DK", attended: 24, ltv: 1_440 },
];

const MOCK_CAPACITY_RISKS = [
  { className: "Reformer Basics", instructor: "Mike Chen", day: "Tuesday", time: "2:00 PM", capacity: 35 },
  { className: "Stretch & Release", instructor: "Liam Torres", day: "Wednesday", time: "3:00 PM", capacity: 42 },
  { className: "Beginner Barre", instructor: "Ava Brooks", day: "Friday", time: "11:00 AM", capacity: 48 },
  { className: "Evening Flow", instructor: "Elena Voss", day: "Thursday", time: "7:00 PM", capacity: 55 },
  { className: "Power Reformer", instructor: "Sarah Kim", day: "Monday", time: "6:00 AM", capacity: 62 },
];

const MOCK_UPCOMING_CLASSES = [
  { name: "Morning Reformer Flow", time: "8:00 AM", instructor: "Sarah Kim", checkedIn: 14, capacity: 18 },
  { name: "Mat Pilates Sculpt", time: "9:30 AM", instructor: "Elena Voss", checkedIn: 10, capacity: 16 },
  { name: "Power Reformer", time: "11:00 AM", instructor: "Sarah Kim", checkedIn: 0, capacity: 18 },
  { name: "Barre Fusion", time: "12:30 PM", instructor: "Ava Brooks", checkedIn: 0, capacity: 14 },
  { name: "Stretch & Release", time: "2:00 PM", instructor: "Liam Torres", checkedIn: 0, capacity: 12 },
  { name: "Evening Flow", time: "5:30 PM", instructor: "Elena Voss", checkedIn: 0, capacity: 16 },
  { name: "Reformer Basics", time: "6:30 PM", instructor: "Mike Chen", checkedIn: 0, capacity: 18 },
  { name: "Sunset Stretch", time: "7:30 PM", instructor: "Ava Brooks", checkedIn: 0, capacity: 12 },
];

const LIVE_TRANSACTIONS = [
  { label: "10-Class Pack Refill (SMS)", student: "Jessica T.", amount: "$199.00", time: "Just now" },
  { label: "Drop-in Rate (Waitlist Auto-Charge)", student: "Mark S.", amount: "$35.00", time: "10 mins ago" },
  { label: "Unlimited Monthly VIP", student: "Amanda R.", amount: "$249.00", time: "1 hour ago" },
  { label: "5-Class Intro Pack", student: "David K.", amount: "$125.00", time: "2 hours ago" },
  { label: "Private Session (1-on-1)", student: "Sophia L.", amount: "$95.00", time: "3 hours ago" },
];

/* Date-range multipliers so filters visibly change KPI numbers */
const DATE_MULTIPLIER: Record<string, number> = {
  today: 0.04,
  week: 0.25,
  month: 1,
  ytd: 8.5,
};

/* Revenue chart data keyed by granularity */
function generateRevenueChart(
  granularity: string,
  dateRange: string,
  instructorFilter: string,
  premium: boolean
) {
  const instScale = instructorFilter === "all" ? 1 : 0.3;
  const base = (DATE_MULTIPLIER[dateRange] ?? 1) * instScale;
  const premiumBoost = premium ? 3 : 1;

  if (granularity === "day") {
    return Array.from({ length: 14 }, (_, i) => ({
      label: `Feb ${i + 1}`,
      revenue: Math.round((800 + Math.random() * 600) * base * premiumBoost),
    }));
  }
  if (granularity === "week") {
    return ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"].map((w) => ({
      label: w,
      revenue: Math.round((3_200 + Math.random() * 1_800) * base * premiumBoost),
    }));
  }
  // quarter
  return ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"].map((q) => ({
    label: q,
    revenue: Math.round((12_000 + Math.random() * 6_000) * base * premiumBoost),
  }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AnalyticsDashboard() {
  const viewAsRole = useViewAsRole();
  const { state: demoState } = useFinanceDemo();
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("month");
  const [instructor, setInstructor] = useState("all");
  const [chartGranularity, setChartGranularity] = useState("week");

  const isPremium = demoState.seeded;
  const isSeeding = demoState.loading;

  const ACTIVE_INSTRUCTORS = isPremium ? PREMIUM_INSTRUCTORS : DEFAULT_INSTRUCTORS;
  const ACTIVE_CLASSES = isPremium ? PREMIUM_CLASSES : DEFAULT_CLASSES;

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiLoading(false);
      setAiResponse(
        isPremium
          ? "Your total revenue this month is $42,500, up 12.4% from last month. Sarah Jenkins is your top-performing instructor, generating $12,400 across 64 classes with an average capacity of 82%. Your ARPU is $198."
          : "Your total revenue for Q3 and Q4 was $84,500, up 12% from the first half of the year. Sarah Kim was your top-performing instructor during this period, generating $18,200 across 142 classes with an average capacity of 89%."
      );
    }, 1500);
  };

  const isOwner = viewAsRole === "owner";

  /* ── Compute filtered data ── */
  const multiplier = DATE_MULTIPLIER[dateRange] ?? 1;
  const instScale = instructor === "all" ? 1 : 0.3;
  const scale = multiplier * instScale;

  const filteredInstructors = useMemo(() => {
    let list = ACTIVE_INSTRUCTORS;
    if (instructor !== "all") {
      list = list.filter((i) => i.name === instructor);
    }
    return list.map((i) => ({
      ...i,
      revenue: Math.round(i.revenue * multiplier),
      classes: Math.max(1, Math.round(i.classes * multiplier)),
    }));
  }, [instructor, multiplier, ACTIVE_INSTRUCTORS]);

  const filteredClasses = useMemo(() => {
    let list = ACTIVE_CLASSES;
    if (instructor !== "all") {
      list = list.filter((c) => c.instructor === instructor);
    }
    return list.map((c) => ({
      ...c,
      revenue: Math.round(c.revenue * multiplier),
    }));
  }, [instructor, multiplier, ACTIVE_CLASSES]);

  const filteredStudents = useMemo(() => {
    return MOCK_STUDENTS.map((s) => ({
      ...s,
      attended: Math.max(1, Math.round(s.attended * multiplier)),
      ltv: Math.round(s.ltv * multiplier),
    }));
  }, [multiplier]);

  const filteredCapacity = useMemo(() => {
    let list = MOCK_CAPACITY_RISKS;
    if (instructor !== "all") {
      list = list.filter((r) => r.instructor === instructor);
    }
    return list;
  }, [instructor]);

  const totalRevenue = isPremium ? Math.round(42_500 * scale) : Math.round(14_250 * scale);
  const avgCapacity = instructor === "all" ? (isPremium ? 84 : 78) : 71;
  const activeMemberships = isPremium ? Math.round(214 * multiplier) : Math.round(342 * multiplier);
  const trendRevenue = isPremium ? 12.4 : (instructor === "all" ? 12 : 8);
  const trendCapacity = instructor === "all" ? 4 : -3;
  const trendMemberships = instructor === "all" ? (isPremium ? 6 : -2) : -5;
  const arpu = isPremium ? "$198" : "$142";
  const ytdRevenue = isPremium ? "$184,200" : "$98,400";

  const chartData = useMemo(
    () => generateRevenueChart(chartGranularity, dateRange, instructor, isPremium),
    [chartGranularity, dateRange, instructor, isPremium]
  );

  if (isSeeding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-8 justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Initializing demo environment…</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-5"><Skeleton className="h-[240px] w-full" /></CardContent></Card>
      </div>
    );
  }

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
                placeholder="Ask your data... (e.g., 'What was our revenue for the last 2 quarters?')"
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
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOwner ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">SmartCover Alert</p>
            <p className="text-xs text-muted-foreground">
              Sarah just picked up Mike's Thursday 6:00 AM class. Public schedule updated.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Just now</Badge>
        </div>
      </div>

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
            {ACTIVE_INSTRUCTORS.map((inst) => (
              <SelectItem key={inst.name} value={inst.name}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Topline KPIs ────────────────────────────────────── */}
      <div className={`grid gap-4 transition-all duration-300 ease-in-out ${isOwner ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {isOwner ? (
          <>
            <KPICard label="Monthly Revenue" value={`$${totalRevenue.toLocaleString()}`} trend={trendRevenue} icon={<DollarSign className="h-4 w-4" />} />
            <KPICard label="YTD Revenue" value={ytdRevenue} trend={0} icon={<BarChart3 className="h-4 w-4" />} hideTrend />
            <KPICard label="Active Memberships" value={activeMemberships.toLocaleString()} trend={trendMemberships} icon={<Users className="h-4 w-4" />} />
            <KPICard label="ARPU" value={arpu} trend={isPremium ? 4.2 : 1.8} icon={<Activity className="h-4 w-4" />} />
          </>
        ) : (
          <>
            <KPICard label="Classes Today" value="8" trend={0} icon={<CalendarDays className="h-4 w-4" />} hideTrend />
            <KPICard label="Check-ins Expected" value="142" trend={0} icon={<UserCheck className="h-4 w-4" />} hideTrend />
            <KPICard label="Waitlist Action Needed" value="3" trend={0} icon={<Clock className="h-4 w-4" />} hideTrend badgeLabel="spots pending" />
          </>
        )}
      </div>

      {/* ── Revenue Chart (Owner only) ─────────────────────── */}
      {isOwner && (
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
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} className="text-muted-foreground" width={55} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Transactions Feed (Owner only, when seeded) ── */}
      {isOwner && isPremium && (
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
              {LIVE_TRANSACTIONS.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.student}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{tx.amount}</p>
                    <p className="text-xs text-muted-foreground">{tx.time}</p>
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
            <CardTitle className="text-base">Top {filteredInstructors.length >= 5 ? 5 : filteredInstructors.length} Instructors</CardTitle>
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
                    {inst.classes} classes
                    {"capacity" in inst && ` · ${inst.capacity}% capacity`}
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
              <p className="text-sm text-muted-foreground">No data for this filter</p>
            )}
          </CardContent>
        </Card>

        {/* Top Classes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top {filteredClasses.length >= 5 ? 5 : filteredClasses.length} Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {filteredClasses.slice(0, 5).map((cls, i) => (
              <div key={cls.name} className="flex items-center gap-3">
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
              <p className="text-sm text-muted-foreground">No classes by this instructor</p>
            )}
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {filteredStudents.slice(0, 5).map((stu, i) => (
              <div key={stu.name} className="flex items-center gap-3">
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
                  <p className="text-xs text-muted-foreground">{stu.attended} classes attended</p>
                </div>
                {isOwner && (
                  <span className="text-sm font-semibold text-foreground">
                    ${stu.ltv.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Section: Owner = Capacity Risks, Front Desk = Upcoming Classes ── */}
      <div className="transition-all duration-300 ease-in-out">
        {isOwner ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">Capacity Risks & Utilization</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {filteredCapacity.map((risk, i) => {
                const isLowest = i === 0;
                return (
                  <div
                    key={risk.className}
                    className={`flex items-center gap-4 rounded-lg border p-3 ${
                      isLowest ? "border-destructive/40 bg-destructive/5" : "bg-card"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {risk.instructor} — {risk.day} {risk.time} {risk.className}
                      </p>
                    </div>
                    <Badge variant={isLowest ? "destructive" : "outline"} className="shrink-0">
                      {risk.capacity}%
                    </Badge>
                    {isLowest && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs">
                        <Sparkles className="h-3 w-3" />
                        Send AI Promo
                      </Button>
                    )}
                  </div>
                );
              })}
              {filteredCapacity.length === 0 && (
                <p className="text-sm text-muted-foreground">No capacity risks for this instructor</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Upcoming Classes Today</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {MOCK_UPCOMING_CLASSES.map((cls) => (
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
                    {cls.checkedIn > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KPICard({
  label,
  value,
  trend,
  icon,
  hideTrend,
  badgeLabel,
}: {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  hideTrend?: boolean;
  badgeLabel?: string;
}) {
  const positive = trend >= 0;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {!hideTrend ? (
          <Badge
            variant="outline"
            className={`gap-1 ${positive ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </Badge>
        ) : badgeLabel ? (
          <Badge variant="outline" className="text-muted-foreground">
            {badgeLabel}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
