import { useState } from "react";
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
} from "lucide-react";
import { useViewAsRole, type ViewAsRole } from "@/components/AppLayout";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_INSTRUCTORS = [
  { name: "Sarah Kim", initials: "SK", revenue: 4_820, classes: 38 },
  { name: "Elena Voss", initials: "EV", revenue: 3_950, classes: 31 },
  { name: "Mike Chen", initials: "MC", revenue: 2_780, classes: 24 },
  { name: "Ava Brooks", initials: "AB", revenue: 1_540, classes: 14 },
  { name: "Liam Torres", initials: "LT", revenue: 1_160, classes: 11 },
];

const MOCK_CLASSES = [
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

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AnalyticsDashboard() {
  const viewAsRole = useViewAsRole();
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("month");
  const [instructor, setInstructor] = useState("all");
  const [activeDays, setActiveDays] = useState<boolean[]>(Array(7).fill(true));

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    setTimeout(() => {
      setAiLoading(false);
      setAiResponse(
        "Your total revenue for Q3 and Q4 was $84,500, up 12% from the first half of the year. Sarah Kim was your top-performing instructor during this period, generating $18,200 across 142 classes with an average capacity of 89%."
      );
    }, 1500);
  };

  const toggleDay = (i: number) =>
    setActiveDays((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const isOwner = viewAsRole === "owner";

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

        <div className="flex gap-1">
          {DAYS.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                activeDays[i]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <Select value={instructor} onValueChange={setInstructor}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Instructors</SelectItem>
            {MOCK_INSTRUCTORS.map((inst) => (
              <SelectItem key={inst.name} value={inst.name}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Topline KPIs ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3 transition-all duration-300 ease-in-out">
        {isOwner ? (
          <>
            <KPICard label="Total Revenue" value="$14,250" trend={12} icon={<DollarSign className="h-4 w-4" />} />
            <KPICard label="Avg Class Capacity" value="78%" trend={4} icon={<BarChart3 className="h-4 w-4" />} />
            <KPICard label="Active Memberships" value="342" trend={-2} icon={<Users className="h-4 w-4" />} />
          </>
        ) : (
          <>
            <KPICard label="Classes Today" value="8" trend={0} icon={<CalendarDays className="h-4 w-4" />} hideTrend />
            <KPICard label="Check-ins Expected" value="142" trend={0} icon={<UserCheck className="h-4 w-4" />} hideTrend />
            <KPICard label="Waitlist Action Needed" value="3" trend={0} icon={<Clock className="h-4 w-4" />} hideTrend badgeLabel="spots pending" />
          </>
        )}
      </div>

      {/* ── Leaderboards ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3 transition-all duration-300 ease-in-out">
        {/* Top Instructors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 Instructors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {MOCK_INSTRUCTORS.map((inst, i) => (
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
                  <p className="text-xs text-muted-foreground">{inst.classes} classes</p>
                </div>
                {isOwner && (
                  <span className="text-sm font-semibold text-foreground">
                    ${inst.revenue.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Classes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {MOCK_CLASSES.map((cls, i) => (
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
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top 5 Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {MOCK_STUDENTS.map((stu, i) => (
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
              {MOCK_CAPACITY_RISKS.map((risk, i) => {
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
