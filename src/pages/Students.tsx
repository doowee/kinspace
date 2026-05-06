import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { studioColorClass } from "@/lib/studio-colors";
import { useViewAsRole } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, MessageCircle, Lock, Home, AlertTriangle, Award, Star, Plus, ChevronDown, CreditCard, Coins, ArrowUp, ArrowDown, ArrowUpDown, Clock, Download, Send, Hourglass, RefreshCw } from "lucide-react";
import DirectMessageDrawer from "@/components/communication/DirectMessageDrawer";
import BulkSmsDialog, { type BulkSmsMode } from "@/components/students/BulkSmsDialog";
import SmsCampaignHistory from "@/components/students/SmsCampaignHistory";
import { toast } from "sonner";
import { format } from "date-fns";

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  return `${local.charAt(0)}***@${domain}`;
};

interface StudentRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  sms_opted_out: boolean;
  class_points: number;
  subscription_name: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  total_bookings: number;
  last_booking_at: string | null;
  home_studio_id: string | null;
  home_studio_name: string | null;
  injury_notes: string | null;
  staff_notes: string | null;
  created_at: string;
}

interface EditData {
  first_name: string;
  last_name: string;
  phone: string;
  home_studio_id: string;
  injury_notes: string;
  staff_notes: string;
}

interface TransactionRow {
  id: string;
  amount: number;
  description: string | null;
  payment_method: string;
  status: string;
  created_at: string;
}

/* ─── Access Status Badge (reused in table + sheet) ─── */
function AccessStatusBadge({ student, size = "sm" }: { student: StudentRow; size?: "sm" | "lg" }) {
  const textSize = size === "lg" ? "text-xs" : "text-[10px]";
  if (student.subscription_name) {
    return (
      <Badge variant="outline" className={`${textSize} gap-1 bg-yellow-500/15 text-yellow-700 border-yellow-300`}>
        🏆 {student.subscription_name}
      </Badge>
    );
  }
  if (student.class_points >= 1) {
    return (
      <Badge variant="outline" className={`${textSize} gap-1 bg-blue-500/15 text-blue-700 border-blue-300`}>
        <Coins className="h-3 w-3" />{student.class_points} Points
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`${textSize} text-muted-foreground`}>No Access</Badge>
  );
}

type TierFilter = "all" | "members" | "points" | "none" | "inactive" | "expiring";

const INACTIVE_DAYS = 60;
const INACTIVE_MS = INACTIVE_DAYS * 24 * 60 * 60 * 1000;
const EXPIRING_DAYS = 7;
const EXPIRING_MS = EXPIRING_DAYS * 24 * 60 * 60 * 1000;

function isInactive(s: StudentRow): boolean {
  if (!s.last_booking_at) return false;
  return Date.now() - new Date(s.last_booking_at).getTime() > INACTIVE_MS;
}

function isExpiringSoon(s: StudentRow): boolean {
  if (!s.subscription_name || !s.subscription_period_end) return false;
  const end = new Date(s.subscription_period_end).getTime();
  const now = Date.now();
  return end > now && end - now <= EXPIRING_MS;
}

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function expiresLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d <= 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `Expires in ${d}d`;
}

function getTier(s: StudentRow): "members" | "points" | "none" {
  if (s.subscription_name) return "members";
  if (s.class_points >= 1) return "points";
  return "none";
}

/* ─── Track 2: persistent view state ─── */
const VIEW_STORAGE_KEY = "students-crm-view-v1";
type SortKey = "name" | "bookings" | "last" | "membership";
type SortDir = "asc" | "desc";
interface PersistedView {
  q: string;
  tierFilter: TierFilter;
  sortKey: SortKey;
  sortDir: SortDir;
}
const TIER_VALUES: TierFilter[] = ["all", "members", "points", "none", "inactive", "expiring"];
const SORT_KEYS: SortKey[] = ["name", "bookings", "last", "membership"];
function loadPersistedView(): PersistedView {
  const fallback: PersistedView = { q: "", tierFilter: "all", sortKey: "name", sortDir: "asc" };
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return {
      q: typeof v?.q === "string" ? v.q : "",
      tierFilter: TIER_VALUES.includes(v?.tierFilter) ? v.tierFilter : "all",
      sortKey: SORT_KEYS.includes(v?.sortKey) ? v.sortKey : "name",
      sortDir: v?.sortDir === "desc" ? "desc" : "asc",
    };
  } catch {
    return fallback;
  }
}

/* ─── Track 3: CSV helpers ─── */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Students() {
  const { activeStudio, activeRole } = useStudio();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Track 2 — persisted view state (lazy init from localStorage)
  const initialView = useRef<PersistedView>(loadPersistedView()).current;
  const [search, setSearch] = useState(initialView.q);
  const [tierFilter, setTierFilter] = useState<TierFilter>(initialView.tierFilter);
  const [sortKey, setSortKey] = useState<SortKey>(initialView.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialView.sortDir);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [editData, setEditData] = useState<EditData>({ first_name: "", last_name: "", phone: "", home_studio_id: "", injury_notes: "", staff_notes: "" });
  const [orgStudios, setOrgStudios] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [dmStudent, setDmStudent] = useState<StudentRow | null>(null);
  const [studioIds, setStudioIds] = useState<string[]>([]);

  // Add-points inline state
  const [addPointsAmount, setAddPointsAmount] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);
  const [showAddPoints, setShowAddPoints] = useState(false);

  // Transaction history
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [txOpen, setTxOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // Bulk SMS composer (Re-engage + Renewal nudge)
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [bulkSmsMode, setBulkSmsMode] = useState<BulkSmsMode>("reengage");
  const [campaignRefreshKey, setCampaignRefreshKey] = useState(0);

  // Track 2 — persist view state (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          VIEW_STORAGE_KEY,
          JSON.stringify({ q: search, tierFilter, sortKey, sortDir })
        );
      } catch { /* quota or disabled */ }
    }, 300);
    return () => clearTimeout(t);
  }, [search, tierFilter, sortKey, sortDir]);

  const viewAsRole = useViewAsRole();
  const canSeeEmail = viewAsRole === "owner";

  useEffect(() => {
    const fetchStudents = async () => {
      if (!activeStudio) { setLoading(false); return; }
      setLoading(true);

      const { data: studioRow } = await supabase
        .from("studios")
        .select("organization_id")
        .eq("id", activeStudio.id)
        .single();

      const orgId = studioRow?.organization_id;
      let ids: string[] = [activeStudio.id];

      if (orgId) {
        const { data: orgStudios } = await supabase
          .from("studios")
          .select("id")
          .eq("organization_id", orgId);
        if (orgStudios && orgStudios.length > 0) {
          ids = orgStudios.map((s) => s.id);
        }
      }
      setStudioIds(ids);

      // Fetch org studio names for the home-studio selector
      const { data: orgStudioRows } = await supabase.from("studios").select("id, name").in("id", ids);
      setOrgStudios(orgStudioRows ?? []);

      const { data: members } = await supabase
        .from("studio_members")
        .select("user_id")
        .in("studio_id", ids)
        .eq("role", "student");

      if (!members || members.length === 0) { setStudents([]); setLoading(false); return; }

      const userIds = [...new Set(members.map((m) => m.user_id))];

      // Parallel fetches
      const [profilesRes, bookingsRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, first_name, last_name, phone, home_studio_id, injury_notes, staff_notes, created_at, class_points, sms_opted_out")
          .in("id", userIds),
        supabase
          .from("bookings")
          .select("user_id, created_at")
          .in("studio_id", ids)
          .in("status", ["confirmed", "checked_in"])
          .in("user_id", userIds),
        supabase
          .from("user_subscriptions")
          .select("user_id, status, current_period_end, product_id, products(name)")
          .eq("status", "active")
          .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
          .in("user_id", userIds),
      ]);

      const profiles = profilesRes.data ?? [];
      const bookings = bookingsRes.data ?? [];
      const subs = subsRes.data ?? [];

      // Home studio names
      const homeStudioIds = [...new Set(profiles.map((p: any) => p.home_studio_id).filter(Boolean))];
      let studioNameMap: Record<string, string> = {};
      if (homeStudioIds.length > 0) {
        const { data: studioRows } = await supabase.from("studios").select("id, name").in("id", homeStudioIds);
        (studioRows ?? []).forEach((s: any) => { studioNameMap[s.id] = s.name; });
      }

      // Booking map
      const bookingMap: Record<string, { count: number; last: string | null }> = {};
      bookings.forEach((b: any) => {
        if (!bookingMap[b.user_id]) bookingMap[b.user_id] = { count: 0, last: null };
        bookingMap[b.user_id].count++;
        if (!bookingMap[b.user_id].last || b.created_at > bookingMap[b.user_id].last!) {
          bookingMap[b.user_id].last = b.created_at;
        }
      });

      // Subscription map (first active sub per user)
      const subMap: Record<string, { name: string; status: string; periodEnd: string | null }> = {};
      subs.forEach((s: any) => {
        if (!subMap[s.user_id]) {
          subMap[s.user_id] = {
            name: (s.products as any)?.name ?? "Subscription",
            status: s.status,
            periodEnd: s.current_period_end,
          };
        }
      });

      const rows: StudentRow[] = profiles.map((p: any) => ({
        user_id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone ?? null,
        class_points: p.class_points ?? 0,
        subscription_name: subMap[p.id]?.name ?? null,
        subscription_status: subMap[p.id]?.status ?? null,
        subscription_period_end: subMap[p.id]?.periodEnd ?? null,
        total_bookings: bookingMap[p.id]?.count ?? 0,
        last_booking_at: bookingMap[p.id]?.last ?? null,
        home_studio_id: p.home_studio_id ?? null,
        home_studio_name: p.home_studio_id ? (studioNameMap[p.home_studio_id] ?? null) : null,
        injury_notes: p.injury_notes ?? null,
        staff_notes: p.staff_notes ?? null,
        created_at: p.created_at,
      }));
      rows.sort((a, b) => (a.first_name ?? a.email).localeCompare(b.first_name ?? b.email));
      setStudents(rows);
      setLoading(false);
    };
    fetchStudents();
  }, [activeStudio?.id]);

  const filtered = useMemo(() => {
    let rows = students;
    if (tierFilter === "inactive") {
      rows = rows.filter(isInactive);
    } else if (tierFilter === "expiring") {
      rows = rows.filter(isExpiringSoon);
    } else if (tierFilter !== "all") {
      rows = rows.filter((s) => getTier(s) === tierFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((s) =>
        s.email.toLowerCase().includes(q) || s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q)
      );
    }
    const tierRank = { members: 0, points: 1, none: 2 } as const;
    const nameOf = (s: StudentRow) =>
      (s.first_name || s.last_name ? [s.first_name, s.last_name].filter(Boolean).join(" ") : s.email).toLowerCase();
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = nameOf(a).localeCompare(nameOf(b));
      else if (sortKey === "bookings") cmp = a.total_bookings - b.total_bookings;
      else if (sortKey === "last") {
        const at = a.last_booking_at ? new Date(a.last_booking_at).getTime() : 0;
        const bt = b.last_booking_at ? new Date(b.last_booking_at).getTime() : 0;
        cmp = at - bt;
      } else if (sortKey === "membership") {
        cmp = tierRank[getTier(a)] - tierRank[getTier(b)];
        // Track 4 — expiring-soon members tie-break ahead of other members
        if (cmp === 0 && getTier(a) === "members") {
          const ax = isExpiringSoon(a) ? 0 : 1;
          const bx = isExpiringSoon(b) ? 0 : 1;
          cmp = ax - bx;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, search, tierFilter, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const displayName = (s: StudentRow) => {
    if (s.first_name || s.last_name) return [s.first_name, s.last_name].filter(Boolean).join(" ");
    return s.email;
  };

  /* ─── Track 3: CSV export ─── */
  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Membership Tier", "Subscription", "Points", "Total Bookings", "Last Visit", "Inactive"];
    const rows = filtered.map((s) => [
      displayName(s),
      s.email,
      s.phone ?? "",
      getTier(s),
      s.subscription_name ?? "",
      String(s.class_points),
      String(s.total_bookings),
      s.last_booking_at ? format(new Date(s.last_booking_at), "yyyy-MM-dd") : "",
      isInactive(s) ? "Yes" : "No",
    ]);
    const today = format(new Date(), "yyyy-MM-dd");
    const slug = (activeStudio?.slug || "studio").toLowerCase();
    downloadCsv(`students-${slug}-${today}.csv`, [headers, ...rows]);
    toast.success(`Exported ${rows.length} student${rows.length === 1 ? "" : "s"}`);
  };

  /* ─── Bulk SMS recipients (shared composer) ─── */
  const bulkRecipients = useMemo(() => {
    const rows = bulkSmsMode === "reengage"
      ? (tierFilter === "inactive" ? filtered : [])
      : (tierFilter === "expiring" ? filtered : []);
    return rows.map((s) => ({
      user_id: s.user_id,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone,
      subscription_period_end: s.subscription_period_end,
    }));
  }, [bulkSmsMode, tierFilter, filtered]);

  const reengageDefaultBody =
    "Hi {first_name}, we miss you at {studio_name}! Come back this week — your spot is waiting. Book here: {booking_url}";
  const renewDefaultBody =
    "Hi {first_name}, your {studio_name} membership renews in {days_left} days. Tap below to keep your spot — see you on the mat. {booking_url}";

  const openSheet = (student: StudentRow) => {
    setSelectedStudent(student);
    setEditData({
      first_name: student.first_name ?? "",
      last_name: student.last_name ?? "",
      phone: student.phone ?? "",
      home_studio_id: student.home_studio_id ?? "",
      injury_notes: student.injury_notes ?? "",
      staff_notes: student.staff_notes ?? "",
    });
    setShowAddPoints(false);
    setAddPointsAmount("");
    setTxOpen(false);
    setTransactions([]);
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editData.first_name || null,
        last_name: editData.last_name || null,
        phone: editData.phone || null,
        home_studio_id: editData.home_studio_id || null,
        injury_notes: editData.injury_notes || null,
        staff_notes: editData.staff_notes || null,
      })
      .eq("id", selectedStudent.user_id);

    setSaving(false);
    if (error) { toast.error("Failed to update: " + error.message); return; }

    setStudents((prev) =>
      prev.map((s) =>
        s.user_id === selectedStudent.user_id
          ? {
              ...s,
              first_name: editData.first_name || null,
              last_name: editData.last_name || null,
              phone: editData.phone || null,
              home_studio_id: editData.home_studio_id || null,
              home_studio_name: orgStudios.find((st) => st.id === editData.home_studio_id)?.name ?? null,
              injury_notes: editData.injury_notes || null,
              staff_notes: editData.staff_notes || null,
            }
          : s
      )
    );
    setSelectedStudent(null);
    toast.success("Student profile updated");
  };

  /* ─── Add Points ─── */
  const handleAddPoints = async () => {
    if (!selectedStudent) return;
    const amount = parseInt(addPointsAmount, 10);
    if (!amount || amount < 1) { toast.error("Enter a positive number"); return; }
    setAddingPoints(true);
    const { error } = await supabase.rpc("increment_class_points", {
      _user_id: selectedStudent.user_id,
      _amount: amount,
    });
    setAddingPoints(false);
    if (error) { toast.error("Failed: " + error.message); return; }

    const newPoints = selectedStudent.class_points + amount;
    setStudents((prev) => prev.map((s) => s.user_id === selectedStudent.user_id ? { ...s, class_points: newPoints } : s));
    setSelectedStudent((prev) => prev ? { ...prev, class_points: newPoints } : prev);
    setAddPointsAmount("");
    setShowAddPoints(false);
    toast.success(`Added ${amount} point${amount > 1 ? "s" : ""}`);
  };

  /* ─── Load Transaction History ─── */
  const loadTransactions = useCallback(async () => {
    if (!selectedStudent || studioIds.length === 0) return;
    setTxLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, description, payment_method, status, created_at")
      .eq("user_id", selectedStudent.user_id)
      .in("studio_id", studioIds)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions((data as TransactionRow[]) ?? []);
    setTxLoading(false);
  }, [selectedStudent?.user_id, studioIds]);

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Students</h2>
          <p className="mt-1 text-muted-foreground">All clients across your organization</p>
        </div>
        <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3"><Users className="h-4 w-4" />{students.length} total</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: "all", label: "All", count: students.length },
              { id: "members", label: "Members", count: students.filter((s) => getTier(s) === "members").length },
              { id: "points", label: "Points", count: students.filter((s) => getTier(s) === "points").length },
              { id: "none", label: "No Access", count: students.filter((s) => getTier(s) === "none").length },
              { id: "inactive", label: "Inactive (60d+)", count: students.filter(isInactive).length },
              { id: "expiring", label: "Expiring soon", count: students.filter(isExpiringSoon).length },
            ] as { id: TierFilter; label: string; count: number }[]).map((chip) => (
              <Button
                key={chip.id}
                size="sm"
                variant={tierFilter === chip.id ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setTierFilter(chip.id)}
              >
                {chip.label} <span className="ml-1.5 opacity-60 tabular-nums">{chip.count}</span>
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              {tierFilter === "inactive" && filtered.length > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => { setBulkSmsMode("reengage"); setBulkSmsOpen(true); }}
                >
                  <Send className="h-3 w-3" />
                  Re-engage ({filtered.length})
                </Button>
              )}
              {tierFilter === "expiring" && filtered.length > 0 && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => { setBulkSmsMode("renew"); setBulkSmsOpen(true); }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Renew ({filtered.length})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
              >
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>
          {(tierFilter === "inactive" || tierFilter === "expiring") && (
            <SmsCampaignHistory
              mode={tierFilter === "inactive" ? "reengage" : "renew"}
              refreshKey={campaignRefreshKey}
            />
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Loading students…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{search ? `No students matching "${search}"` : "No students found."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        Name
                        {sortKey === "name" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Home Studio</TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("membership")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                        Membership
                        {sortKey === "membership" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => toggleSort("bookings")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                        Bookings
                        {sortKey === "bookings" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => toggleSort("last")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                        Last Visit
                        {sortKey === "last" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSheet(s)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName(s)}</span>
                          {s.injury_notes && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {s.total_bookings <= 3 && <Star className="h-3.5 w-3.5 text-blue-500" />}
                          {s.total_bookings >= 50 && <Award className="h-3.5 w-3.5 text-yellow-500" />}
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); setDmStudent(s); }}>
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {canSeeEmail ? s.email : (
                          <span className="inline-flex items-center gap-1.5 select-none text-muted-foreground/60 text-xs"><Lock className="h-3 w-3" />{maskEmail(s.email)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.home_studio_name && s.home_studio_id ? (
                          <Badge variant="outline" className={`text-[10px] gap-1 ${studioColorClass(s.home_studio_id)}`}>
                            <Home className="h-2.5 w-2.5" />{s.home_studio_name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AccessStatusBadge student={s} />
                          {isExpiringSoon(s) && s.subscription_period_end && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 border-amber-300">
                              <Hourglass className="h-2.5 w-2.5" />{expiresLabel(s.subscription_period_end)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.total_bookings}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isInactive(s) && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground border-border">
                              <Clock className="h-2.5 w-2.5" />Inactive
                            </Badge>
                          )}
                          <span>{s.last_booking_at ? format(new Date(s.last_booking_at), "MMM d, yyyy") : "—"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DM Drawer */}
      {dmStudent && (
        <DirectMessageDrawer open={!!dmStudent} onOpenChange={(open) => { if (!open) setDmStudent(null); }} studentName={displayName(dmStudent)} studentEmail={dmStudent.email} role={activeRole} />
      )}

      {/* Student Detail CRM Sheet */}
      <Sheet open={!!selectedStudent} onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto flex flex-col">
          {selectedStudent && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{displayName(selectedStudent)}</SheetTitle>
                <SheetDescription>{selectedStudent.email}</SheetDescription>
              </SheetHeader>

              {/* Badges & Quick Stats */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedStudent.total_bookings <= 3 && (
                  <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />First-Timer</Badge>
                )}
                {selectedStudent.total_bookings >= 50 && (
                  <Badge className="gap-1 bg-yellow-500/15 text-yellow-700 border-yellow-300"><Award className="h-3 w-3" />Milestone</Badge>
                )}
                {selectedStudent.injury_notes && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Injury</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="rounded-md border border-border p-3">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{selectedStudent.total_bookings}</p>
                  <p className="text-[11px] text-muted-foreground">Total Classes</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{format(new Date(selectedStudent.created_at), "MMM yyyy")}</p>
                  <p className="text-[11px] text-muted-foreground">Join Date</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <AccessStatusBadge student={selectedStudent} size="lg" />
                  <p className="text-[11px] text-muted-foreground mt-1">Membership</p>
                </div>
              </div>

              {/* ─── Section: Billing & Access ─── */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><CreditCard className="h-4 w-4" />Billing & Access</h3>

                {/* Subscription details */}
                {selectedStudent.subscription_name && (
                  <div className="rounded-md border border-border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">🏆 {selectedStudent.subscription_name}</span>
                      <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-700 border-green-300">Active</Badge>
                    </div>
                    {selectedStudent.subscription_period_end && (
                      <p className="text-xs text-muted-foreground">Renews {format(new Date(selectedStudent.subscription_period_end), "MMM d, yyyy")}</p>
                    )}
                  </div>
                )}

                {/* Points balance */}
                <div className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-foreground">{selectedStudent.class_points} Class Points</span>
                    </div>
                    {!showAddPoints ? (
                      <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => setShowAddPoints(true)}>
                        <Plus className="h-3 w-3" />Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          className="h-7 w-16 text-xs"
                          placeholder="Qty"
                          value={addPointsAmount}
                          onChange={(e) => setAddPointsAmount(e.target.value)}
                          autoFocus
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" disabled={addingPoints} onClick={handleAddPoints}>
                          {addingPoints ? "…" : "Add"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-1 text-xs" onClick={() => { setShowAddPoints(false); setAddPointsAmount(""); }}>✕</Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction History (collapsible) */}
                <Collapsible open={txOpen} onOpenChange={(open) => { setTxOpen(open); if (open && transactions.length === 0) loadTransactions(); }}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between text-sm font-medium px-3 h-9">
                      View Transaction History
                      <ChevronDown className={`h-4 w-4 transition-transform ${txOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    {txLoading ? (
                      <p className="text-xs text-muted-foreground text-center py-4 animate-pulse">Loading…</p>
                    ) : transactions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No transactions found.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                            <div>
                              <p className="font-medium text-foreground">{tx.description ?? "Payment"}</p>
                              <p className="text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")} · {tx.payment_method}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium tabular-nums text-foreground">${Number(tx.amount).toFixed(2)}</p>
                              <Badge variant="outline" className="text-[9px]">{tx.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Demographics */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground">Demographics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="crm-fn">First Name</Label>
                    <Input id="crm-fn" value={editData.first_name} onChange={(e) => setEditData((d) => ({ ...d, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="crm-ln">Last Name</Label>
                    <Input id="crm-ln" value={editData.last_name} onChange={(e) => setEditData((d) => ({ ...d, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-phone">Phone</Label>
                  <Input id="crm-phone" value={editData.phone} onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-email">Email</Label>
                  <Input id="crm-email" value={selectedStudent.email} disabled className="opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-home-studio">Home Studio</Label>
                  <Select value={editData.home_studio_id} onValueChange={(val) => setEditData((d) => ({ ...d, home_studio_id: val }))}>
                    <SelectTrigger id="crm-home-studio">
                      <SelectValue placeholder="Select home studio" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgStudios.map((st) => (
                        <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-injury">Official Injury / Medical Notes</Label>
                  <Textarea id="crm-injury" rows={3} value={editData.injury_notes} onChange={(e) => setEditData((d) => ({ ...d, injury_notes: e.target.value }))} />
                  <p className="text-[11px] text-amber-600">⚠️ Warning: This is the official liability/medical profile. Editing this will update the ⚠️ flag on the instructor Kiosk.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-staff">Internal Staff Notes</Label>
                  <Textarea id="crm-staff" rows={3} value={editData.staff_notes} onChange={(e) => setEditData((d) => ({ ...d, staff_notes: e.target.value }))} />
                  <p className="text-[11px] text-muted-foreground">General instructor observations and preferences.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-background border-t border-border pt-4 pb-2 mt-auto flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk SMS composer (Re-engage + Renew) */}
      <BulkSmsDialog
        open={bulkSmsOpen}
        onOpenChange={setBulkSmsOpen}
        mode={bulkSmsMode}
        recipients={bulkRecipients}
        defaultBody={bulkSmsMode === "reengage" ? reengageDefaultBody : renewDefaultBody}
        onSent={() => setCampaignRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
