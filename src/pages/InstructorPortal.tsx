import { useState, useEffect, useCallback } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Clock, Users, ChevronRight, CheckCircle2, LogOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface InstructorClass {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  capacity: number;
  studio_name: string;
  booked_count: number;
}

interface RosterStudent {
  booking_id: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export default function InstructorPortal() {
  const { user, signOut } = useAuth();
  const [instructorName, setInstructorName] = useState("");
  const [classes, setClasses] = useState<InstructorClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Roster sheet
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterClass, setRosterClass] = useState<InstructorClass | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Find instructor records linked to this user
    const { data: instRecords } = await supabase
      .from("instructors")
      .select("id, name, studio_id, studios:studio_id(name)")
      .eq("user_id", user.id);

    if (!instRecords || instRecords.length === 0) {
      setLoading(false);
      return;
    }

    setInstructorName((instRecords[0] as any).name || "");
    const instructorIds = instRecords.map((i: any) => i.id);
    const studioMap: Record<string, string> = {};
    instRecords.forEach((i: any) => {
      studioMap[i.id] = (i.studios as any)?.name ?? "";
    });

    // Fetch upcoming classes for these instructor IDs
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, description, start_time, capacity, instructor_id")
      .in("instructor_id", instructorIds)
      .gt("start_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (!classData || classData.length === 0) {
      setClasses([]);
      setLoading(false);
      return;
    }

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
      capacity: c.capacity,
      studio_name: studioMap[c.instructor_id] ?? "",
      booked_count: countMap[c.id] || 0,
    }));

    setClasses(mapped);
    setLoading(false);
  }, [user?.id]);

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
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold font-display text-primary">{classes.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming Classes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold font-display text-primary">
                {classes.reduce((sum, c) => sum + c.booked_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Classes */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            My Upcoming Classes
          </h2>

          {classes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No upcoming classes assigned to you.
              </CardContent>
            </Card>
          ) : (
            classes.map((cls) => {
              const isFull = cls.booked_count >= cls.capacity;
              return (
                <Card
                  key={cls.id}
                  className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                  onClick={() => openRoster(cls)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-sm">{cls.name}</p>
                      {cls.studio_name && (
                        <p className="text-[11px] text-muted-foreground">{cls.studio_name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(cls.start_time), "EEE, MMM d")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(cls.start_time), "h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs font-medium ${isFull ? "text-destructive" : "text-foreground"}`}>
                          {cls.booked_count}/{cls.capacity} booked
                        </span>
                        {isFull && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">Full</Badge>}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

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
