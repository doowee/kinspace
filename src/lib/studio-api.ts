import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface InstructorStat {
  name: string;
  initials: string;
  revenue: number;
  classes: number;
  capacity: number;
}

export interface ClassStat {
  name: string;
  instructor: string;
  revenue: number;
  bookings: number;
}

export interface StudentStat {
  name: string;
  initials: string;
  attended: number;
  ltv: number;
}

export interface CapacityRisk {
  className: string;
  instructor: string;
  day: string;
  time: string;
  capacity: number;
}

export interface TransactionRow {
  id: string;
  description: string;
  studentName: string;
  amount: number;
  createdAt: string;
  status: string;
  paymentMethod: string;
}

export interface UpcomingClass {
  name: string;
  time: string;
  instructor: string;
  checkedIn: number;
  capacity: number;
}

export interface DashboardData {
  totalRevenue: number;
  memberCount: number;
  arpu: number;
  avgCapacity: number;
  topInstructors: InstructorStat[];
  topClasses: ClassStat[];
  topStudents: StudentStat[];
  capacityRisks: CapacityRisk[];
  recentTransactions: TransactionRow[];
  revenueByDay: { date: string; revenue: number }[];
  upcomingClasses: UpcomingClass[];
  classesToday: number;
  checkInsExpected: number;
  waitlistPending: number;
}

export interface FinanceData {
  transactions: TransactionRow[];
  totalRevenue: number;
  ytdRevenue: number;
  memberCount: number;
  arpu: number;
  chartData: { date: string; revenue: number }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function profileName(p: any): string {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
}

function buildDailyChart(
  completedTx: { amount: number; created_at: string }[],
  days: number
): { date: string; revenue: number }[] {
  const now = new Date();
  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    dayMap[format(subDays(now, i), "yyyy-MM-dd")] = 0;
  }
  for (const t of completedTx) {
    const key = format(new Date(t.created_at), "yyyy-MM-dd");
    if (key in dayMap) dayMap[key] += Number(t.amount);
  }
  return Object.entries(dayMap).map(([d, r]) => ({
    date: format(new Date(d), "MMM d"),
    revenue: Math.round(r * 100) / 100,
  }));
}

/* ------------------------------------------------------------------ */
/*  Dashboard Data                                                     */
/* ------------------------------------------------------------------ */

export async function fetchDashboardData(
  studioId: string,
  days: number
): Promise<DashboardData> {
  const now = new Date();
  const since = subDays(now, days).toISOString();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  const [txRes, memberRes, classesRes, bookingsRes, instructorsRes, todayClassesRes, waitlistRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, amount, created_at, description, payment_method, status, user_id, profiles(first_name, last_name, email)"
        )
        .eq("studio_id", studioId)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      supabase
        .from("studio_members")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", studioId),
      supabase
        .from("classes")
        .select("id, name, start_time, capacity_total, instructor_id")
        .eq("studio_id", studioId)
        .gte("start_time", since)
        .order("start_time", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, user_id, class_id, status, profiles(first_name, last_name)")
        .eq("studio_id", studioId)
        .in("status", ["confirmed", "checked_in", "waitlist"]),
      supabase.from("instructors").select("id, name").eq("studio_id", studioId),
      supabase
        .from("classes")
        .select("id, name, start_time, capacity_total, instructor_id")
        .eq("studio_id", studioId)
        .gte("start_time", todayStart)
        .lte("start_time", todayEnd)
        .order("start_time", { ascending: true }),
      supabase
        .from("bookings")
        .select("id")
        .eq("studio_id", studioId)
        .eq("status", "waitlist"),
    ]);

  const transactions = txRes.data ?? [];
  const completedTx = transactions.filter((t) => t.status === "completed");
  const memberCount = memberRes.count ?? 0;
  const classes = classesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const instructors = instructorsRes.data ?? [];
  const todayClasses = todayClassesRes.data ?? [];

  // ── Metrics ──
  const totalRevenue = completedTx.reduce((s, t) => s + Number(t.amount), 0);
  const arpu = memberCount > 0 ? Math.round(totalRevenue / memberCount) : 0;

  // Avg capacity
  const classFill: Record<string, { booked: number; cap: number }> = {};
  for (const cls of classes) {
    classFill[cls.id] = { booked: 0, cap: cls.capacity_total };
  }
  for (const b of bookings) {
    if (classFill[b.class_id] && ["confirmed", "checked_in"].includes(b.status)) {
      classFill[b.class_id].booked++;
    }
  }
  const fillEntries = Object.values(classFill);
  const avgCapacity =
    fillEntries.length > 0
      ? Math.round(
          fillEntries.reduce((s, e) => s + (e.booked / Math.max(e.cap, 1)) * 100, 0) /
            fillEntries.length
        )
      : 0;

  // ── Top Instructors ──
  const instMap = new Map(instructors.map((i) => [i.id, i.name]));
  const instAgg: Record<string, { cls: number; bk: number; cap: number }> = {};
  for (const cls of classes) {
    if (!cls.instructor_id || !instMap.has(cls.instructor_id)) continue;
    const a = (instAgg[cls.instructor_id] ??= { cls: 0, bk: 0, cap: 0 });
    a.cls++;
    a.cap += cls.capacity_total;
    a.bk += classFill[cls.id]?.booked ?? 0;
  }
  const topInstructors: InstructorStat[] = Object.entries(instAgg)
    .map(([id, s]) => ({
      name: instMap.get(id) ?? "Unknown",
      initials: initials(instMap.get(id) ?? "??"),
      classes: s.cls,
      revenue: s.bk * 35,
      capacity: s.cap > 0 ? Math.round((s.bk / s.cap) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Top Classes ──
  const topClasses: ClassStat[] = classes
    .map((cls) => {
      const bk = classFill[cls.id]?.booked ?? 0;
      return {
        name: cls.name,
        instructor: instMap.get(cls.instructor_id ?? "") ?? "—",
        revenue: bk * 35,
        bookings: bk,
      };
    })
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  // ── Top Students ──
  const stuAgg: Record<string, { count: number; name: string }> = {};
  for (const b of bookings) {
    if (!["confirmed", "checked_in"].includes(b.status)) continue;
    const n = profileName(b.profiles);
    const a = (stuAgg[b.user_id] ??= { count: 0, name: n });
    a.count++;
  }
  const topStudents: StudentStat[] = Object.values(stuAgg)
    .map((s) => ({
      name: s.name,
      initials: initials(s.name),
      attended: s.count,
      ltv: s.count * 35,
    }))
    .sort((a, b) => b.attended - a.attended)
    .slice(0, 5);

  // ── Capacity Risks (future classes < 60% fill) ──
  const capacityRisks: CapacityRisk[] = classes
    .filter((cls) => {
      const fill =
        classFill[cls.id]?.cap > 0
          ? (classFill[cls.id].booked / classFill[cls.id].cap) * 100
          : 0;
      return fill < 60 && new Date(cls.start_time) > now;
    })
    .map((cls) => {
      const fill = Math.round(
        ((classFill[cls.id]?.booked ?? 0) / Math.max(classFill[cls.id]?.cap ?? 1, 1)) * 100
      );
      const d = new Date(cls.start_time);
      return {
        className: cls.name,
        instructor: instMap.get(cls.instructor_id ?? "") ?? "—",
        day: format(d, "EEEE"),
        time: format(d, "h:mm a"),
        capacity: fill,
      };
    })
    .sort((a, b) => a.capacity - b.capacity)
    .slice(0, 5);

  // ── Recent Transactions ──
  const recentTransactions: TransactionRow[] = transactions.slice(0, 10).map((t) => ({
    id: t.id,
    description: t.description ?? "Payment",
    studentName: profileName(t.profiles),
    amount: Number(t.amount),
    createdAt: t.created_at,
    status: t.status,
    paymentMethod: t.payment_method,
  }));

  // ── Revenue by Day ──
  const revenueByDay = buildDailyChart(
    completedTx.map((t) => ({ amount: Number(t.amount), created_at: t.created_at })),
    Math.min(days, 365)
  );

  // ── Upcoming Classes Today ──
  const upcomingClasses: UpcomingClass[] = todayClasses.map((cls) => {
    const checkedIn = bookings.filter(
      (b) => b.class_id === cls.id && b.status === "checked_in"
    ).length;
    const booked = classFill[cls.id]?.booked ?? 0;
    return {
      name: cls.name,
      time: format(new Date(cls.start_time), "h:mm a"),
      instructor: instMap.get(cls.instructor_id ?? "") ?? "—",
      checkedIn,
      capacity: cls.capacity_total,
    };
  });

  // ── Front-desk stats ──
  const classesToday = todayClasses.length;
  const checkInsExpected = todayClasses.reduce(
    (s, cls) => s + (classFill[cls.id]?.booked ?? 0),
    0
  );
  const waitlistPending = waitlistRes.data?.length ?? 0;

  return {
    totalRevenue,
    memberCount,
    arpu,
    avgCapacity,
    topInstructors,
    topClasses,
    topStudents,
    capacityRisks,
    recentTransactions,
    revenueByDay,
    upcomingClasses,
    classesToday,
    checkInsExpected,
    waitlistPending,
  };
}

/* ------------------------------------------------------------------ */
/*  Finance Data                                                       */
/* ------------------------------------------------------------------ */

export async function fetchFinanceData(studioId: string): Promise<FinanceData> {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  const ytdStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const [txRes, ytdRes, memberRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, amount, created_at, description, payment_method, status, user_id, profiles(first_name, last_name, email)"
      )
      .eq("studio_id", studioId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount")
      .eq("studio_id", studioId)
      .eq("status", "completed")
      .gte("created_at", ytdStart),
    supabase
      .from("studio_members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId),
  ]);

  const rawTx = txRes.data ?? [];
  const completedTx = rawTx.filter((t) => t.status === "completed");
  const totalRevenue = completedTx.reduce((s, t) => s + Number(t.amount), 0);
  const ytdRevenue = (ytdRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const memberCount = memberRes.count ?? 0;
  const arpu = memberCount > 0 ? Math.round(totalRevenue / memberCount) : 0;

  const transactions: TransactionRow[] = rawTx.map((t) => ({
    id: t.id,
    description: t.description ?? "Payment",
    studentName: profileName(t.profiles),
    amount: Number(t.amount),
    createdAt: t.created_at,
    status: t.status,
    paymentMethod: t.payment_method,
  }));

  const chartData = buildDailyChart(
    completedTx.map((t) => ({ amount: Number(t.amount), created_at: t.created_at })),
    30
  );

  return { transactions, totalRevenue, ytdRevenue, memberCount, arpu, chartData };
}

/* ------------------------------------------------------------------ */
/*  Org Dashboard Data                                                 */
/* ------------------------------------------------------------------ */

export interface OrgStudioBreakdown {
  id: string;
  name: string;
  location: string | null;
  revenue: number;
  clients: number;
  bookings: number;
}

export interface OrgNetworkFeedItem {
  id: string;
  studioName: string;
  description: string;
  studentName: string;
  amount: number;
  createdAt: string;
  type: "transaction" | "booking";
}

export interface OrgTopClass {
  name: string;
  totalBookings: number;
  avgFillRate: number; // 0-100
}

export interface OrgTopPackage {
  name: string;
  totalRevenue: number;
  unitsSold: number;
}

export interface OrgDashboardData {
  globalRevenue: number;
  totalClients: number;
  totalBookings: number;
  studioBreakdowns: OrgStudioBreakdown[];
  networkFeed: OrgNetworkFeedItem[];
  studios: { id: string; name: string; location: string | null }[];
  topClasses: OrgTopClass[];
  topPackages: OrgTopPackage[];
}

export interface OrgDashboardFilters {
  studioId?: string | null; // null or undefined = all locations
  since?: string;           // ISO date string
}

export async function fetchOrgDashboardData(
  orgId: string,
  filters?: OrgDashboardFilters
): Promise<OrgDashboardData> {
  // 1. Get all studios in this org (always fetch all for filter dropdown)
  const { data: orgStudios } = await supabase
    .from("studios")
    .select("id, name, location")
    .eq("organization_id", orgId);

  const allStudios = orgStudios ?? [];

  // Determine which studio IDs to query
  const targetStudios = filters?.studioId
    ? allStudios.filter((s) => s.id === filters.studioId)
    : allStudios;
  const studioIds = targetStudios.map((s) => s.id);
  const studioMap = new Map(allStudios.map((s) => [s.id, s]));

  if (studioIds.length === 0) {
    return { globalRevenue: 0, totalClients: 0, totalBookings: 0, studioBreakdowns: [], networkFeed: [], studios: allStudios, topClasses: [], topPackages: [] };
  }

  const since = filters?.since ?? subDays(new Date(), 30).toISOString();

  // 2. Fetch transactions, bookings, members, and classes in parallel
  let txQuery = supabase
    .from("transactions")
    .select("id, amount, created_at, description, status, studio_id, profiles(first_name, last_name, email)")
    .in("studio_id", studioIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  let bookingsQuery = supabase
    .from("bookings")
    .select("id, user_id, studio_id, created_at, status, class_id, classes(name, capacity_total)")
    .in("studio_id", studioIds)
    .in("status", ["confirmed", "checked_in"])
    .order("created_at", { ascending: false });

  // Only apply date filter if not "all time" (since will be a very old date for all time)
  if (since) {
    txQuery = txQuery.gte("created_at", since);
    bookingsQuery = bookingsQuery.gte("created_at", since);
  }

  const [txRes, bookingsRes, membersRes] = await Promise.all([
    txQuery,
    bookingsQuery,
    supabase
      .from("studio_members")
      .select("user_id, studio_id")
      .in("studio_id", studioIds)
      .eq("role", "student"),
  ]);

  const transactions = txRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const members = membersRes.data ?? [];

  // 3. Aggregate KPIs
  const globalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const uniqueClients = new Set(members.map((m) => m.user_id));
  const totalClients = uniqueClients.size;
  const totalBookings = bookings.length;

  // 4. Per-studio breakdowns
  const studioRevMap: Record<string, number> = {};
  const studioBookMap: Record<string, number> = {};
  const studioClientSet: Record<string, Set<string>> = {};

  for (const id of studioIds) {
    studioRevMap[id] = 0;
    studioBookMap[id] = 0;
    studioClientSet[id] = new Set();
  }
  for (const t of transactions) studioRevMap[t.studio_id] += Number(t.amount);
  for (const b of bookings) studioBookMap[b.studio_id]++;
  for (const m of members) studioClientSet[m.studio_id]?.add(m.user_id);

  const studioBreakdowns: OrgStudioBreakdown[] = targetStudios
    .map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      revenue: studioRevMap[s.id] ?? 0,
      clients: studioClientSet[s.id]?.size ?? 0,
      bookings: studioBookMap[s.id] ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // 5. Network feed
  const feedTx: OrgNetworkFeedItem[] = transactions.slice(0, 15).map((t) => ({
    id: t.id,
    studioName: studioMap.get(t.studio_id)?.name ?? "Unknown",
    description: t.description ?? "Payment",
    studentName: profileName(t.profiles),
    amount: Number(t.amount),
    createdAt: t.created_at,
    type: "transaction",
  }));

  const feedBookings: OrgNetworkFeedItem[] = bookings.slice(0, 15).map((b: any) => ({
    id: b.id,
    studioName: studioMap.get(b.studio_id)?.name ?? "Unknown",
    description: b.classes?.name ?? "Class Booking",
    studentName: "",
    amount: 0,
    createdAt: b.created_at,
    type: "booking",
  }));

  const networkFeed = [...feedTx, ...feedBookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // 6. Top Classes by bookings (grouped by class name)
  const classAgg: Record<string, { bookings: number; totalCap: number; classCount: number }> = {};
  for (const b of bookings as any[]) {
    const className = b.classes?.name ?? "Unknown";
    const cap = b.classes?.capacity_total ?? 10;
    const a = (classAgg[className] ??= { bookings: 0, totalCap: 0, classCount: 0 });
    a.bookings++;
    // Track unique class instances for avg fill
    if (!a.totalCap) a.totalCap = 0;
  }
  // We need class instance counts for fill rate — approximate from bookings data
  const classInstances: Record<string, Set<string>> = {};
  const classCapMap: Record<string, number> = {};
  for (const b of bookings as any[]) {
    const className = b.classes?.name ?? "Unknown";
    const classId = b.class_id;
    const cap = b.classes?.capacity_total ?? 10;
    (classInstances[className] ??= new Set()).add(classId);
    classCapMap[className] = cap; // last seen cap per class name
  }
  const topClasses: OrgTopClass[] = Object.entries(classAgg)
    .map(([name, agg]) => {
      const instances = classInstances[name]?.size ?? 1;
      const cap = classCapMap[name] ?? 10;
      const avgFillRate = Math.min(100, Math.round((agg.bookings / (instances * cap)) * 100));
      return { name, totalBookings: agg.bookings, avgFillRate };
    })
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .slice(0, 5);

  // 7. Best Selling Packages (grouped by transaction description)
  const pkgAgg: Record<string, { revenue: number; units: number }> = {};
  for (const t of transactions) {
    const desc = t.description ?? "Other";
    const a = (pkgAgg[desc] ??= { revenue: 0, units: 0 });
    a.revenue += Number(t.amount);
    a.units++;
  }
  const topPackages: OrgTopPackage[] = Object.entries(pkgAgg)
    .map(([name, agg]) => ({ name, totalRevenue: agg.revenue, unitsSold: agg.units }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  return { globalRevenue, totalClients, totalBookings, studioBreakdowns, networkFeed, studios: allStudios, topClasses, topPackages };
