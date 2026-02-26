import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Users, CheckCircle2, Pencil, UserPlus, UsersRound, CalendarIcon, Flame, AlertTriangle, ListOrdered } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/schedule/TimePicker";
import EditClassDialog from "@/components/schedule/EditClassDialog";
import ViewStudentsDialog from "@/components/schedule/ViewStudentsDialog";
import ManualBookDialog from "@/components/schedule/ManualBookDialog";

interface InstructorRow {
  id: string;
  name: string;
}

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  capacity_total: number;
  instructor_id: string | null;
  studio_id: string;
  instructors: { name: string } | null;
}

interface BookingCount {
  class_id: string;
  count: number;
}

export default function Schedule() {
  const { user } = useAuth();
  const { activeStudio, activeRole } = useStudio();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noCreditsOpen, setNoCreditsOpen] = useState(false);
  const [bookingClassId, setBookingClassId] = useState<string | null>(null);

  // Owner dialog state
  const [editClass, setEditClass] = useState<ClassRow | null>(null);
  const [viewStudentsClass, setViewStudentsClass] = useState<ClassRow | null>(null);
  const [manualBookClass, setManualBookClass] = useState<ClassRow | null>(null);

  // Booking counts per class & user's own bookings
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});
  const [userBookedClassIds, setUserBookedClassIds] = useState<Set<string>>(new Set());

  // Form state
  const [className, setClassName] = useState("");
  const [classDate, setClassDate] = useState<Date>(new Date());
  const [classTime, setClassTime] = useState({ hour: 9, minute: 0 });
  const [capacity, setCapacity] = useState("10");
  const [classDescription, setClassDescription] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  // Instructors
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);

  const canManage = activeRole === "owner" || activeRole === "instructor";

  const fetchInstructors = async () => {
    if (!activeStudio) return;
    let query = supabase
      .from("instructors")
      .select("id, name")
      .order("display_order");

    query = query.eq("studio_id", activeStudio.id);

    const { data } = await query;
    setInstructors(data ?? []);
  };

  const fetchClasses = async () => {
    if (!activeStudio) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*, instructors(name)")
      .eq("studio_id", activeStudio.id)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to fetch classes:", error);
    } else {
      setClasses((data as unknown as ClassRow[]) ?? []);
    }
    setLoading(false);
  };

  const fetchBookingData = async () => {
    if (!activeStudio || !user) return;

    // Fetch all confirmed bookings for this studio to get counts
    const { data: allBookings } = await supabase
      .from("bookings")
      .select("class_id, status")
      .eq("studio_id", activeStudio.id)
      .in("status", ["confirmed", "waitlist"]);

    // Count confirmed and waitlist bookings per class
    const counts: Record<string, number> = {};
    const wCounts: Record<string, number> = {};
    allBookings?.forEach((b) => {
      if (b.status === "confirmed") {
        counts[b.class_id] = (counts[b.class_id] || 0) + 1;
      } else if (b.status === "waitlist") {
        wCounts[b.class_id] = (wCounts[b.class_id] || 0) + 1;
      }
    });
    setBookingCounts(counts);
    setWaitlistCounts(wCounts);

    // Fetch user's own bookings
    const { data: myBookings } = await supabase
      .from("bookings")
      .select("class_id")
      .eq("user_id", user.id)
      .eq("studio_id", activeStudio.id)
      .in("status", ["confirmed", "waitlist"]);

    setUserBookedClassIds(new Set(myBookings?.map((b) => b.class_id) ?? []));
  };

  useEffect(() => {
    fetchClasses();
    fetchInstructors();
  }, [activeStudio?.id]);

  useEffect(() => {
    if (classes.length > 0) fetchBookingData();
  }, [classes, activeStudio?.id, user?.id]);

  const classesOnDate = classes.filter((c) =>
    isSameDay(new Date(c.start_time), selectedDate)
  );

  const datesWithClasses = classes.map((c) => new Date(c.start_time));

  const handleBook = async (cls: ClassRow) => {
    if (!user || !activeStudio) return;
    setBookingClassId(cls.id);

    try {
      const isFull = (bookingCounts[cls.id] || 0) >= cls.capacity_total;
      const bookingStatus = isFull ? "waitlist" : "confirmed";

      // Insert booking
      const { error: bookError } = await supabase.from("bookings").insert({
        studio_id: activeStudio.id,
        user_id: user.id,
        class_id: cls.id,
        status: bookingStatus,
      });

      if (bookError) throw bookError;

      toast({
        title: isFull ? "Added to Waitlist" : "Success! You are booked",
        description: isFull
          ? `You've been added to the waitlist for ${cls.name}.`
          : `You're confirmed for ${cls.name}.`,
      });

      // Refresh
      await fetchBookingData();
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setBookingClassId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudio || !className) return;

    setSubmitting(true);

    // Build a proper local Date, then convert to ISO for storage
    const dt = new Date(classDate);
    dt.setHours(classTime.hour, classTime.minute, 0, 0);

    const { error } = await supabase.from("classes").insert({
      name: className,
      description: classDescription || null,
      start_time: dt.toISOString(),
      capacity_total: parseInt(capacity) || 10,
      studio_id: activeStudio.id,
      instructor_id: selectedInstructorId === "none" ? null : selectedInstructorId,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Class created" });
      setClassName("");
      setClassDescription("");
      setClassTime({ hour: 9, minute: 0 });
      setCapacity("10");
      setSelectedInstructorId("none");
      setDialogOpen(false);
      fetchClasses();
    }
    setSubmitting(false);
  };

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Schedule</h2>
          <p className="mt-1 text-muted-foreground">
            Classes for {activeStudio.name}
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="class-name">Class Name</Label>
                  <Input
                    id="class-name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Morning Flow"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="class-description">Description</Label>
                  <textarea
                    id="class-description"
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    placeholder="Brief description of the class…"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div>
                  <Label>Instructor</Label>
                  <Select value={selectedInstructorId} onValueChange={setSelectedInstructorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {instructors.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="flex items-center gap-1.5 mb-1.5"><CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                          {format(classDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={classDate}
                          onSelect={(d) => d && setClassDate(d)}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <TimePicker label="Time" value={classTime} onChange={setClassTime} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="class-capacity">Capacity</Label>
                  <Input
                    id="class-capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Class"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className={cn("pointer-events-auto")}
              modifiers={{ hasClass: datesWithClasses }}
              modifiersClassNames={{
                hasClass: "bg-primary/20 font-bold text-primary",
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : classesOnDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled for this day.</p>
          ) : (
            classesOnDate.map((cls) => {
              const count = bookingCounts[cls.id] || 0;
              const waitlistCount = waitlistCounts[cls.id] || 0;
              const isFull = count >= cls.capacity_total;
              const isLow = count < 2 && cls.capacity_total >= 3;
              const isBooked = userBookedClassIds.has(cls.id);
              const isBooking = bookingClassId === cls.id;
              const fillPercent = Math.min((count / cls.capacity_total) * 100, 100);

              return (
                <Card
                  key={cls.id}
                  className={cn(
                    "transition-all duration-300",
                    isFull && "border-primary/40 bg-primary/[0.03] shadow-md shadow-primary/5",
                    isLow && !isFull && "border-orange-300/50 bg-orange-50/30 dark:border-orange-500/30 dark:bg-orange-950/10"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{cls.name}</p>
                          {isFull && (
                            <Badge className="bg-primary/15 text-primary border-primary/25 gap-1 text-[10px] font-bold uppercase tracking-wide">
                              <Flame className="h-3 w-3" />
                              Sold Out
                            </Badge>
                          )}
                          {isLow && !isFull && (
                            <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950/30 gap-1 text-[10px] font-bold uppercase tracking-wide">
                              <AlertTriangle className="h-3 w-3" />
                              Low Enrollment
                            </Badge>
                          )}
                        </div>
                        {cls.instructors?.name && (
                          <p className="text-xs text-muted-foreground">with {cls.instructors.name}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(cls.start_time), "h:mm a")}
                          </span>
                        </div>
                      </div>
                      {canManage ? (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setViewStudentsClass(cls)} className="gap-1.5">
                            <UsersRound className="h-3.5 w-3.5" />
                            {count}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setManualBookClass(cls)}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditClass(cls)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : user && (
                        isBooked ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Booked
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={isFull ? "outline" : "default"}
                            disabled={isBooking}
                            onClick={() => handleBook(cls)}
                          >
                            {isBooking ? "Booking…" : isFull ? "Waitlist" : "Book"}
                          </Button>
                        )
                      )}
                    </div>

                    {/* Capacity bar + waitlist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {count}/{cls.capacity_total} booked
                        </span>
                        {waitlistCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <ListOrdered className="h-3 w-3" />
                            {waitlistCount} on waitlist
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isFull
                              ? "bg-primary"
                              : isLow
                                ? "bg-orange-400"
                                : "bg-primary/60"
                          )}
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* No Credits Modal */}
      <Dialog open={noCreditsOpen} onOpenChange={setNoCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">No Credits Available</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You don't have any active credits to book this class. Purchase a package to get started.
          </p>
          <Button className="w-full mt-2" onClick={() => { setNoCreditsOpen(false); navigate("/settings"); }}>
            Buy a Package
          </Button>
        </DialogContent>
      </Dialog>

      {/* Owner Dialogs */}
      <EditClassDialog
        open={!!editClass}
        onOpenChange={(open) => !open && setEditClass(null)}
        cls={editClass}
        instructors={instructors}
        onSaved={fetchClasses}
      />
      <ViewStudentsDialog
        open={!!viewStudentsClass}
        onOpenChange={(open) => !open && setViewStudentsClass(null)}
        classId={viewStudentsClass?.id ?? null}
        className={viewStudentsClass?.name ?? ""}
        capacity={viewStudentsClass?.capacity_total ?? 0}
        classStartTime={viewStudentsClass?.start_time}
        onBookingsChanged={fetchBookingData}
      />
      {activeStudio && (
        <ManualBookDialog
          open={!!manualBookClass}
          onOpenChange={(open) => !open && setManualBookClass(null)}
          classId={manualBookClass?.id ?? null}
          className={manualBookClass?.name ?? ""}
          studioId={activeStudio.id}
          onBooked={() => { fetchBookingData(); }}
        />
      )}
    </div>
  );
}
