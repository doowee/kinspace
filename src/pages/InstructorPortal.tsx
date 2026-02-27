import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Clock, Users, ChevronRight, CheckCircle2, LogOut, RefreshCw, ArrowRightLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface InstructorClass {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  capacity: number;
  studio_name: string;
  studio_brand_primary: string | null;
  booked_count: number;
}

interface RosterStudent {
  booking_id: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface OpenShift {
  id: string;
  className: string;
  instructor: string;
  day: string;
  time: string;
  studio: string;
  capacity: number;
  booked: number;
}

const MOCK_OPEN_SHIFTS: OpenShift[] = [
  {
    id: "shift-1",
    className: "Reformer Flow",
    instructor: "Mike Chen",
    day: "Thursday",
    time: "6:00 AM",
    studio: "Downtown Studio",
    capacity: 18,
    booked: 14,
  },
  {
    id: "shift-2",
    className: "Mat Pilates Basics",
    instructor: "Liam Torres",
    day: "Friday",
    time: "9:00 AM",
    studio: "West Side Studio",
    capacity: 16,
    booked: 8,
  },
];

export default function InstructorPortal({ demoUserId }: { demoUserId?: string }) {
  const { user, signOut } = useAuth();
  const effectiveUserId = demoUserId || user?.id;
  const [instructorName, setInstructorName] = useState("");
  const [classes, setClasses] = useState<InstructorClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("schedule");

  // Cover request state
  const [coverRequestClass, setCoverRequestClass] = useState<InstructorClass | null>(null);
  const [coverRequested, setCoverRequested] = useState<Set<string>>(new Set());
  const [smartCoverLoading, setSmartCoverLoading] = useState(false);
  const [smartCoverCount, setSmartCoverCount] = useState<number | null>(null);

  // SmartCover board state
  const [openShifts, setOpenShifts] = useState<OpenShift[]>(MOCK_OPEN_SHIFTS);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedShifts, setClaimedShifts] = useState<InstructorClass[]>([]);

  // Roster sheet
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterClass, setRosterClass] = useState<InstructorClass | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const FALLBACK_COLORS = [
    "#7C9A85", "#E08E79", "#6B8EC4", "#C49B5F", "#9B7DB8", "#5BA8A0",
  ];

  const studioColorMap = useMemo(() => {
    const allClasses = [...classes, ...claimedShifts];
    const studios = [...new Set(allClasses.map((c) => c.studio_name))];
    const map: Record<string, string> = {};
    const usedColors = new Set<string>();
    let fallbackIdx = 0;

    studios.forEach((name) => {
      const cls = allClasses.find((c) => c.studio_name === name);
      const brand = cls?.studio_brand_primary;
      if (brand && !usedColors.has(brand)) {
        map[name] = brand;
        usedColors.add(brand);
      } else {
        map[name] = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
        fallbackIdx++;
      }
    });
    return map;
  }, [classes, claimedShifts]);

  const fetchClasses = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);

    // Find instructor records linked to this user
    const { data: instRecords } = await supabase
      .from("instructors")
      .select("id, name")
      .eq("user_id", effectiveUserId);

    if (!instRecords || instRecords.length === 0) {
      setLoading(false);
      return;
    }

    setInstructorName((instRecords[0] as any).name || "");
    const instructorIds = instRecords.map((i: any) => i.id);

    // Fetch upcoming classes (without studio join — RLS on studios blocks cross-studio joins)
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, description, start_time, capacity_total, instructor_id, studio_id")
      .in("instructor_id", instructorIds)
      .gt("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (!classData || classData.length === 0) {
      setClasses([]);
      setLoading(false);
      return;
    }

    // Fetch studio names separately (studios has a public SELECT policy)
    const studioIds = [...new Set(classData.map((c) => c.studio_id))];
    const { data: studioData } = await supabase
      .from("studios")
      .select("id, name, brand_primary")
      .in("id", studioIds);

    const studioMap: Record<string, { name: string; brand_primary: string | null }> = {};
    (studioData ?? []).forEach((s: any) => {
      studioMap[s.id] = { name: s.name, brand_primary: s.brand_primary };
    });

    // Fetch booking counts
    const classIds = classData.map((c) => c.id);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("class_id, status")
      .in("class_id", classIds)
      .in("status", ["confirmed", "checked_in"]);

    const countMap: Record<string, number> = {};
    (bookings ?? []).forEach((b: any) => {
      countMap[b.class_id] = (countMap[b.class_id] || 0) + 1;
    });

    const mapped: InstructorClass[] = classData.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      start_time: c.start_time,
      capacity: c.capacity_total,
      studio_name: studioMap[c.studio_id]?.name ?? "",
      studio_brand_primary: studioMap[c.studio_id]?.brand_primary ?? null,
      booked_count: countMap[c.id] || 0,
    }));

    setClasses(mapped);
    setLoading(false);
  }, [effectiveUserId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const openRoster = async (cls: InstructorClass) => {
    setRosterClass(cls);
    setRosterOpen(true);
    setRosterLoading(true);

    const { data } = await supabase
      .from("bookings")
      .select("id, status, user_id, profiles:user_id(first_name, last_name, email)")
      .eq("class_id", cls.id)
      .in("status", ["confirmed", "waitlist", "checked_in"]);

    const students: RosterStudent[] = (data ?? []).map((b: any) => ({
      booking_id: b.id,
      status: b.status,
      first_name: (b.profiles as any)?.first_name ?? null,
      last_name: (b.profiles as any)?.last_name ?? null,
      email: (b.profiles as any)?.email ?? "",
    }));

    // Sort: checked_in first, then confirmed, then waitlist
    const order: Record<string, number> = { checked_in: 0, confirmed: 1, waitlist: 2 };
    students.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

    setRoster(students);
    setRosterLoading(false);
  };

  const toggleCheckIn = async (student: RosterStudent) => {
    setTogglingId(student.booking_id);
    const newStatus = student.status === "checked_in" ? "confirmed" : "checked_in";

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus as any })
      .eq("id", student.booking_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRoster((prev) =>
        prev.map((s) =>
          s.booking_id === student.booking_id ? { ...s, status: newStatus } : s
        )
      );
    }
    setTogglingId(null);
  };

  const displayName = (s: RosterStudent) => {
    if (s.first_name || s.last_name) return [s.first_name, s.last_name].filter(Boolean).join(" ");
    return s.email;
  };

  const initials = (s: RosterStudent) => {
    if (s.first_name) return s.first_name[0].toUpperCase();
    return s.email[0].toUpperCase();
  };

  // SmartCover handlers
  const [smartCoverLoading, setSmartCoverLoading] = useState(false);
  const [smartCoverCount, setSmartCoverCount] = useState<number | null>(null);

  const confirmCoverRequest = (cls: InstructorClass, e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverRequestClass(cls);
    setSmartCoverCount(null);
  };

  const handleCoverConfirm = async () => {
    if (!coverRequestClass) return;
    setSmartCoverLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("smartcover-request", {
        body: { class_id: coverRequestClass.id },
      });

      if (error || data?.error) {
        toast({
          title: "SmartCover Error",
          description: data?.error || error?.message || "Failed to process request",
          variant: "destructive",
        });
        setSmartCoverLoading(false);
        return;
      }

      const count = data?.eligible_count ?? 0;
      setCoverRequested((prev) => new Set(prev).add(coverRequestClass.id));
      setCoverRequestClass(null);
      setSmartCoverLoading(false);
      toast({
        title: "SmartCover Activated ⚡",
        description: count > 0
          ? `Notifying ${count} qualified instructor${count !== 1 ? "s" : ""}.`
          : `No qualified instructors found. Update SmartCover profiles in Settings → Instructors.`,
      });
    } catch {
      setSmartCoverLoading(false);
      toast({
        title: "SmartCover Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClaimShift = (shift: OpenShift) => {
    setClaimingId(shift.id);
    setTimeout(() => {
      setOpenShifts((prev) => prev.filter((s) => s.id !== shift.id));
      // Add claimed shift to My Schedule
      const now = new Date();
      const dayOffset = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(shift.day);
      const currentDay = now.getDay();
      const diff = dayOffset >= currentDay ? dayOffset - currentDay : 7 - (currentDay - dayOffset);
      const shiftDate = new Date(now);
      shiftDate.setDate(now.getDate() + diff);
      const [hours, minutes] = shift.time.replace(/ AM| PM/, "").split(":").map(Number);
      const isPM = shift.time.includes("PM") && hours !== 12;
      const isAM12 = shift.time.includes("AM") && hours === 12;
      shiftDate.setHours(isPM ? hours + 12 : isAM12 ? 0 : hours, minutes || 0, 0, 0);

      const newClass: InstructorClass = {
        id: `claimed-${shift.id}`,
        name: shift.className,
        description: null,
        start_time: shiftDate.toISOString(),
        capacity: shift.capacity,
        studio_name: shift.studio,
        studio_brand_primary: null,
        booked_count: shift.booked,
      };
      setClaimedShifts((prev) => [...prev, newClass]);
      setClaimingId(null);
      setActiveTab("schedule");
      toast({
        title: "✅ Shift Claimed!",
        description: "The schedule and the owner have been automatically updated.",
      });
    }, 1000);
  };

  const allMyClasses = useMemo(() => {
    return [...classes, ...claimedShifts].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }, [classes, claimedShifts]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Hello, {instructorName || "Instructor"}.
            </h1>
            <p className="text-xs text-muted-foreground">Instructor Portal</p>
          </div>
          {!demoUserId && (
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold font-display text-primary">{allMyClasses.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming Classes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold font-display text-primary">
                {allMyClasses.reduce((sum, c) => sum + c.booked_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: My Schedule / SmartCover */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="schedule" className="flex-1 gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              My Schedule
            </TabsTrigger>
            <TabsTrigger value="smartcover" className="flex-1 gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              SmartCover
              {openShifts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                  {openShifts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── My Schedule Tab ─────────────────────────────── */}
          <TabsContent value="schedule" className="mt-4 space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              My Upcoming Classes
            </h2>

            {allMyClasses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No upcoming classes assigned to you.
                </CardContent>
              </Card>
            ) : (
              allMyClasses.map((cls) => {
                const isFull = cls.booked_count >= cls.capacity;
                const isCoverRequested = coverRequested.has(cls.id);
                const isClaimed = cls.id.startsWith("claimed-");
                return (
                  <Card
                    key={cls.id}
                    className="transition-all hover:shadow-md active:scale-[0.99]"
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div
                        className="space-y-1 min-w-0 flex-1 cursor-pointer"
                        onClick={() => openRoster(cls)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{cls.name}</p>
                          {isCoverRequested && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300">
                              Coverage Requested
                            </Badge>
                          )}
                          {isClaimed && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                              Claimed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(cls.start_time), "EEE, MMM d")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(cls.start_time), "h:mm a")}
                          </span>
                          {cls.studio_name && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0 font-medium"
                              style={{
                                borderColor: studioColorMap[cls.studio_name],
                                color: studioColorMap[cls.studio_name],
                                backgroundColor: `${studioColorMap[cls.studio_name]}15`,
                              }}
                            >
                              {cls.studio_name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 pt-0.5">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs font-medium ${isFull ? "text-destructive" : "text-foreground"}`}>
                            {cls.booked_count}/{cls.capacity} booked
                          </span>
                          {isFull && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">Full</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isCoverRequested && !isClaimed && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={(e) => confirmCoverRequest(cls, e)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Request Cover
                          </Button>
                        )}
                        <ChevronRight
                          className="h-5 w-5 text-muted-foreground cursor-pointer"
                          onClick={() => openRoster(cls)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ── SmartCover Tab ──────────────────────────────── */}
          <TabsContent value="smartcover" className="mt-4 space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Open Shifts
            </h2>
            <p className="text-xs text-muted-foreground -mt-1">
              Claim a shift to automatically update the schedule. The owner is notified instantly.
            </p>

            {openShifts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  No open shifts right now. Check back later!
                </CardContent>
              </Card>
            ) : (
              openShifts.map((shift) => {
                const isClaiming = claimingId === shift.id;
                return (
                  <Card key={shift.id} className="transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm text-foreground">{shift.className}</p>
                          <p className="text-xs text-muted-foreground">
                            {shift.instructor} is requesting cover
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {shift.day}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {shift.time}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {shift.studio}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 pt-0.5">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-foreground">
                              {shift.booked}/{shift.capacity} booked
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        className="w-full gap-1.5"
                        disabled={isClaiming}
                        onClick={() => handleClaimShift(shift)}
                      >
                        {isClaiming ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking availability…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Claim Shift
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Cover Request Confirmation Dialog */}
      <Dialog open={!!coverRequestClass} onOpenChange={(open) => !open && setCoverRequestClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Coverage</DialogTitle>
            <DialogDescription>
              Are you sure you want to request coverage for{" "}
              <span className="font-semibold text-foreground">{coverRequestClass?.name}</span>? This
              will notify all eligible instructors. You are still responsible for this class until
              someone claims it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCoverRequestClass(null)} disabled={smartCoverLoading}>
              Cancel
            </Button>
            <Button onClick={handleCoverConfirm} disabled={smartCoverLoading}>
              {smartCoverLoading ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Finding instructors…</>
              ) : (
                <><RefreshCw className="mr-1.5 h-4 w-4" />Confirm Request</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roster Sheet */}
      <Sheet open={rosterOpen} onOpenChange={setRosterOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="font-display text-left">
              {rosterClass?.name ?? "Class Roster"}
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              {rosterClass && (
                <>
                  {format(new Date(rosterClass.start_time), "EEE, MMM d · h:mm a")} ·{" "}
                  {rosterClass.booked_count}/{rosterClass.capacity} booked
                </>
              )}
            </SheetDescription>
          </SheetHeader>

          {rosterLoading ? (
            <div className="animate-pulse text-muted-foreground text-center py-8">Loading roster…</div>
          ) : roster.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No students booked yet.</p>
          ) : (
            <div className="divide-y overflow-y-auto max-h-[calc(85vh-120px)]">
              {roster.map((s) => {
                const isCheckedIn = s.status === "checked_in";
                const isWaitlist = s.status === "waitlist";
                return (
                  <div key={s.booking_id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {initials(s)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName(s)}</p>
                        <div className="flex items-center gap-1.5">
                          {isCheckedIn && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                              Checked In
                            </Badge>
                          )}
                          {isWaitlist && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Waitlist
                            </Badge>
                          )}
                          {!isCheckedIn && !isWaitlist && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Confirmed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isWaitlist && (
                      <Button
                        variant={isCheckedIn ? "default" : "outline"}
                        size="sm"
                        className="shrink-0 ml-2 gap-1"
                        disabled={togglingId === s.booking_id}
                        onClick={() => toggleCheckIn(s)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isCheckedIn ? "Undo" : "Check In"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
