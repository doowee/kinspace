import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  LogOut,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isToday,
  isBefore,
} from "date-fns";

interface ClassRow {
  id: string;
  name: string;
  start_time: string;
  capacity_total: number;
  booked_count: number;
  class_type: string | null;
}

export default function KioskSchedule() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const instructorId = params.get("instructor") ?? "";
  const instructorName = params.get("name") ?? "Instructor";
  const studioId = params.get("studioId") ?? "";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch classes for instructor on selectedDate
  useEffect(() => {
    if (!instructorId || !studioId) return;

    const fetchClasses = async () => {
      setLoading(true);
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data } = await supabase
        .from("classes")
        .select("id, name, start_time, capacity_total, class_type")
        .eq("instructor_id", instructorId)
        .eq("studio_id", studioId)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time", { ascending: true });

      if (!data || data.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Fetch actual booking counts for these classes (students only)
      const classIds = data.map((c) => c.id);

      // Get staff user_ids to exclude
      const { data: staffMembers } = await supabase
        .from("studio_members")
        .select("user_id")
        .eq("studio_id", studioId)
        .in("role", ["owner", "instructor", "admin"]);

      const staffIds = new Set((staffMembers ?? []).map((m: any) => m.user_id));

      const { data: bookings } = await supabase
        .from("bookings")
        .select("class_id, user_id")
        .in("class_id", classIds)
        .in("status", ["confirmed", "checked_in"]);

      // Count only non-staff bookings per class
      const countMap: Record<string, number> = {};
      (bookings ?? []).forEach((b: any) => {
        if (!staffIds.has(b.user_id)) {
          countMap[b.class_id] = (countMap[b.class_id] || 0) + 1;
        }
      });

      const rows: ClassRow[] = data.map((c) => ({
        id: c.id,
        name: c.name,
        start_time: c.start_time,
        capacity_total: c.capacity_total,
        booked_count: countMap[c.id] ?? 0,
        class_type: c.class_type,
      }));

      setClasses(rows);
      setLoading(false);
    };

    fetchClasses();
  }, [instructorId, studioId, selectedDate]);

  const now = new Date();

  // Find the "up next" class — first future class today
  const upNextClass = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    return classes.find((c) => new Date(c.start_time) > now) ?? null;
  }, [classes, selectedDate, now]);

  const handleLogout = () => {
    navigate("/kiosk-login");
  };

  const dateLabel = isToday(selectedDate)
    ? `Today, ${format(selectedDate, "MMM d")}`
    : format(selectedDate, "EEEE, MMM d");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">{instructorName}</h1>
          <p className="text-sm text-muted-foreground">Schedule</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Exit
        </Button>
      </header>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-3 px-6 py-5 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setSelectedDate((d) => subDays(d, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 text-lg font-semibold px-5 h-11">
              <CalendarIcon className="h-4 w-4" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) setSelectedDate(d);
                setCalendarOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground animate-pulse text-lg">Loading schedule…</p>
          </div>
        ) : classes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-xl font-semibold text-foreground mb-1">No classes scheduled</p>
            <p className="text-muted-foreground">Enjoy the rest of your day!</p>
          </div>
        ) : (
          <>
            {/* Up Next Hero Card */}
            {upNextClass && (
              <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wide">Up Next</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{upNextClass.name}</h2>
                    <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(upNextClass.start_time), "h:mm a")}
                      <span className="mx-1">·</span>
                      <Users className="h-4 w-4" />
                      {upNextClass.booked_count}/{upNextClass.capacity_total} Booked
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="text-base px-6 rounded-xl h-12"
                    onClick={() =>
                      navigate(
                        `/kiosk/live/${upNextClass.id}?instructor=${instructorId}&name=${encodeURIComponent(instructorName)}`
                      )
                    }
                  >
                    Open Roster
                  </Button>
                </div>
              </div>
            )}

            {/* Daily Itinerary */}
            <div className="space-y-2">
              {classes.map((cls) => {
                const classTime = new Date(cls.start_time);
                const isPast = isBefore(classTime, now) && !isToday(selectedDate)
                  ? true
                  : isBefore(classTime, now);
                const isUpNext = upNextClass?.id === cls.id;

                // Skip the up next class from the list since it has its own hero
                if (isUpNext) return null;

                return (
                  <div
                    key={cls.id}
                    className={cn(
                      "rounded-xl border border-border p-4 flex items-center justify-between transition-opacity",
                      isPast && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-right min-w-[70px]">
                        <p className="text-lg font-semibold text-foreground">
                          {format(classTime, "h:mm a")}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{cls.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {cls.booked_count}/{cls.capacity_total} Booked
                          {isPast && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        navigate(
                          `/kiosk/live/${cls.id}?instructor=${instructorId}&name=${encodeURIComponent(instructorName)}`
                        )
                      }
                    >
                      View Roster
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
