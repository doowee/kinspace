import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Users, Clock, AlertTriangle, Trophy, MapPin, Shield, LogOut, FileText } from "lucide-react";
import { format } from "date-fns";

interface RosterStudent {
  booking_id: string;
  user_id: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  home_studio_id: string | null;
  injury_notes: string | null;
  staff_notes: string | null;
  total_bookings: number;
}

interface ClassInfo {
  id: string;
  name: string;
  start_time: string;
  capacity_total: number;
  studio_id: string;
}

const MILESTONES = [10, 25, 50, 100, 150, 200, 250, 500, 1000];

export default function KioskLiveRoster() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const instructorName = searchParams.get("name") ?? "Instructor";

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const [notesStudent, setNotesStudent] = useState<RosterStudent | null>(null);
  const [editStaffNotes, setEditStaffNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchClassAndRoster = useCallback(async () => {
    if (!classId) return;
    setLoading(true);

    // Fetch class info
    const { data: cls } = await supabase
      .from("classes")
      .select("id, name, start_time, capacity_total, studio_id")
      .eq("id", classId)
      .single();

    if (!cls) {
      toast.error("Class not found");
      setLoading(false);
      return;
    }
    setClassInfo(cls as ClassInfo);

    // Fetch bookings with profile data
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status, user_id, profiles:user_id(first_name, last_name, home_studio_id, injury_notes, staff_notes)")
      .eq("class_id", classId)
      .in("status", ["confirmed", "checked_in", "waitlist"]);

    if (!bookings || bookings.length === 0) {
      setRoster([]);
      setLoading(false);
      return;
    }

    // Fetch studio members who are NOT students (instructors/owners/admins) to exclude them
    const { data: staffMembers } = await supabase
      .from("studio_members")
      .select("user_id")
      .eq("studio_id", cls.studio_id)
      .in("role", ["owner", "instructor", "admin"]);

    const staffUserIds = new Set((staffMembers ?? []).map((m: any) => m.user_id));

    // Filter out staff from the bookings list — only keep students
    const studentBookings = bookings.filter((b: any) => !staffUserIds.has(b.user_id));

    if (studentBookings.length === 0) {
      setRoster([]);
      setLoading(false);
      return;
    }

    // Fetch historical booking counts for each student
    const userIds = [...new Set(studentBookings.map((b: any) => b.user_id))];
    const { data: historicalBookings } = await supabase
      .from("bookings")
      .select("user_id")
      .in("user_id", userIds)
      .in("status", ["confirmed", "checked_in"]);

    const countMap: Record<string, number> = {};
    (historicalBookings ?? []).forEach((b: any) => {
      countMap[b.user_id] = (countMap[b.user_id] || 0) + 1;
    });

    const students: RosterStudent[] = studentBookings.map((b: any) => ({
      booking_id: b.id,
      user_id: b.user_id,
      status: b.status,
      first_name: b.profiles?.first_name ?? null,
      last_name: b.profiles?.last_name ?? null,
      home_studio_id: b.profiles?.home_studio_id ?? null,
      injury_notes: b.profiles?.injury_notes ?? null,
      staff_notes: b.profiles?.staff_notes ?? null,
      total_bookings: countMap[b.user_id] ?? 0,
    }));

    // Sort: checked_in first, then confirmed, then waitlist
    const order: Record<string, number> = { checked_in: 0, confirmed: 1, waitlist: 2 };
    students.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

    setRoster(students);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    fetchClassAndRoster();
  }, [fetchClassAndRoster]);

  // Idle timer — auto-logout 15 min after class end
  useEffect(() => {
    if (!classInfo) return;

    const resetIdle = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("touchstart", resetIdle);
    window.addEventListener("click", resetIdle);

    idleTimerRef.current = window.setInterval(() => {
      const classEnd = new Date(classInfo.start_time).getTime() + 60 * 60 * 1000; // assume 1h class
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;

      // Only auto-logout if class has ended AND idle for 15 min
      if (now > classEnd && idleMs > 15 * 60 * 1000) {
        toast.info("Session timed out. Returning to kiosk.");
        navigate("/kiosk-login");
      }
    }, 30_000);

    return () => {
      window.removeEventListener("touchstart", resetIdle);
      window.removeEventListener("click", resetIdle);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [classInfo, navigate]);

  // Optimistic check-in toggle
  const toggleCheckIn = async (student: RosterStudent) => {
    const newStatus = student.status === "checked_in" ? "confirmed" : "checked_in";

    // Optimistic update
    setRoster((prev) =>
      prev.map((s) =>
        s.booking_id === student.booking_id ? { ...s, status: newStatus } : s
      )
    );

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus as any })
      .eq("id", student.booking_id);

    if (error) {
      // Revert on error
      setRoster((prev) =>
        prev.map((s) =>
          s.booking_id === student.booking_id ? { ...s, status: student.status } : s
        )
      );
      toast.error("Check-in failed");
    }
  };

  const bookedCount = roster.filter((s) => s.status === "confirmed" || s.status === "checked_in").length;
  const checkedInCount = roster.filter((s) => s.status === "checked_in").length;
  const displayName = (s: RosterStudent) => {
    const first = s.first_name ?? "";
    const lastInitial = s.last_name ? s.last_name[0].toUpperCase() + "." : "";
    return first ? `${first} ${lastInitial}`.trim() : "Guest";
  };

  const isFirstTimer = (s: RosterStudent) => s.total_bookings <= 1;
  const isTourist = (s: RosterStudent) => s.home_studio_id !== null && classInfo !== null && s.home_studio_id !== classInfo.studio_id;
  const isMilestone = (s: RosterStudent) => MILESTONES.includes(s.total_bookings);
  const hasInjury = (s: RosterStudent) => !!s.injury_notes;

  const openNotes = (student: RosterStudent) => {
    setNotesStudent(student);
    setEditStaffNotes(student.staff_notes ?? "");
  };

  const saveStaffNotes = async () => {
    if (!notesStudent) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("profiles")
      .update({ staff_notes: editStaffNotes } as any)
      .eq("id", notesStudent.user_id);

    if (error) {
      toast.error("Failed to save notes");
      setSavingNotes(false);
      return;
    }

    setRoster((prev) =>
      prev.map((s) =>
        s.user_id === notesStudent.user_id ? { ...s, staff_notes: editStaffNotes } : s
      )
    );
    toast.success("Notes saved");
    setSavingNotes(false);
    setNotesStudent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-xl animate-pulse">Loading roster…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {classInfo?.name ?? "Class"}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {classInfo && format(new Date(classInfo.start_time), "h:mm a")}
              </span>
              <span className="text-xs">Instructor: {instructorName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Metric A: Booked */}
            <div className="rounded-xl border bg-muted/50 px-4 py-2 text-center min-w-[100px]">
              <div className="text-3xl font-bold font-display text-foreground tabular-nums">
                {bookedCount}<span className="text-muted-foreground text-lg">/{classInfo?.capacity_total ?? 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Booked</p>
            </div>

            {/* Metric B: Checked In */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-center min-w-[100px]">
              <div className="text-3xl font-bold font-display text-primary tabular-nums">
                {checkedInCount}<span className="text-muted-foreground text-lg">/{bookedCount}</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Checked In</p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => navigate("/kiosk-login")}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Roster Grid */}
      <main className="p-6">
        {roster.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-xl text-muted-foreground">No students booked for this class.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {roster.map((student) => {
              const isCheckedIn = student.status === "checked_in";
              return (
                <button
                  key={student.booking_id}
                  onClick={() => toggleCheckIn(student)}
                  className={cn(
                    "relative rounded-2xl border-2 p-6 text-left transition-all duration-200 active:scale-[0.97]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isCheckedIn
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/10"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-md"
                  )}
                >
                  {/* Notes button */}
                  <div
                    className="absolute top-3 left-3"
                    onClick={(e) => { e.stopPropagation(); openNotes(student); }}
                  >
                    <FileText className={cn("h-5 w-5", student.staff_notes ? "text-primary" : "text-muted-foreground/40")} />
                  </div>

                  {/* Check indicator */}
                  {isCheckedIn && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                  )}

                  {/* Name */}
                  <p className={cn(
                    "text-2xl font-bold font-display leading-tight mb-3 mt-4",
                    isCheckedIn ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                  )}>
                    {displayName(student)}
                  </p>

                  {/* Flags */}
                  <div className="flex flex-wrap gap-1.5">
                    {isFirstTimer(student) && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 gap-1">
                        🔰 First-Timer
                      </Badge>
                    )}
                    {isTourist(student) && (
                      <Badge className="text-[10px] bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 gap-1">
                        <MapPin className="h-2.5 w-2.5" /> Tourist
                      </Badge>
                    )}
                    {isMilestone(student) && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1">
                        <Trophy className="h-2.5 w-2.5" /> {student.total_bookings}th
                      </Badge>
                    )}
                    {hasInjury(student) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Badge
                            className="text-[10px] bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 gap-1 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" /> Injury
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <p className="font-semibold text-destructive flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> Injury Notes
                            </p>
                            <p className="text-muted-foreground">{student.injury_notes}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {student.status === "waitlist" && (
                      <Badge variant="outline" className="text-[10px]">Waitlist</Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Notes Sheet */}
      <Sheet open={!!notesStudent} onOpenChange={(open) => { if (!open) setNotesStudent(null); }}>
        <SheetContent side="right" className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {notesStudent ? displayName(notesStudent) : "Student"} — Notes
            </SheetTitle>
            <SheetDescription>View injury info and manage internal observations.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Injury Notes — Read Only */}
            <div>
              <label className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4" /> Injury & Modification Notes
              </label>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-foreground">
                {notesStudent?.injury_notes || (
                  <span className="text-muted-foreground italic">No reported injuries.</span>
                )}
              </div>
            </div>

            {/* Staff Notes — Editable */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Instructor Observations (Internal)
              </label>
              <Textarea
                value={editStaffNotes}
                onChange={(e) => setEditStaffNotes(e.target.value)}
                placeholder="Add observations about this student…"
                className="min-h-[120px]"
              />
            </div>

            <Button onClick={saveStaffNotes} disabled={savingNotes} className="w-full">
              {savingNotes ? "Saving…" : "Save Notes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
