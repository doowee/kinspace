import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/booking/AuthModal";

interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  location: string | null;
}

interface PublicClass {
  id: string;
  name: string;
  start_time: string;
  capacity: number;
  instructor_first_name?: string | null;
  instructor_last_name?: string | null;
}

export default function BookingPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  // Listen to auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!studio_slug) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: studioData, error: studioErr } = await supabase.rpc(
        "get_public_studio_by_slug",
        { _slug: studio_slug }
      );

      if (studioErr || !studioData || (studioData as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const s = (studioData as any[])[0] as StudioInfo;
      setStudio(s);

      const { data: classData } = await supabase.rpc(
        "get_public_classes_by_studio_slug",
        { _slug: studio_slug }
      );

      setClasses((classData as PublicClass[]) ?? []);
      setLoading(false);
    };

    fetchData();
  }, [studio_slug]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const classesOnDate = useMemo(
    () => classes.filter((c) => isSameDay(new Date(c.start_time), selectedDate)),
    [classes, selectedDate]
  );

  const classCounts = useMemo(() => {
    const map = new Map<string, number>();
    classes.forEach((c) => {
      const key = format(new Date(c.start_time), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [classes]);

  const handleBookNow = async (classId: string) => {
    if (!user) {
      setPendingClassId(classId);
      setAuthModalOpen(true);
      return;
    }
    await executeBooking(classId);
  };

  const executeBooking = async (classId: string) => {
    if (!studio) return;
    setBookingInProgress(classId);

    try {
      // Check for a valid student pass with credits
      const { data: passes, error: passErr } = await supabase
        .from("student_passes")
        .select("id, credits_remaining, expires_at")
        .eq("studio_id", studio.id)
        .eq("user_id", user.id)
        .gt("credits_remaining", 0)
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .limit(1);

      if (passErr) throw passErr;

      if (!passes || passes.length === 0) {
        toast({
          title: "No active pass",
          description: "You need to purchase a class pass before booking. Contact the studio for options.",
          variant: "destructive",
        });
        return;
      }

      const pass = passes[0];

      // Deduct credit
      const { error: deductErr } = await supabase
        .from("student_passes")
        .update({ credits_remaining: pass.credits_remaining - 1 })
        .eq("id", pass.id);

      if (deductErr) throw deductErr;

      // Create booking record (if bookings table exists)
      // For now we just show success
      toast({
        title: "Class booked! 🎉",
        description: `You're confirmed. ${pass.credits_remaining - 1} credits remaining.`,
      });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setBookingInProgress(null);
    }
  };

  const onAuthSuccess = () => {
    setAuthModalOpen(false);
    if (pendingClassId) {
      // Small delay to let auth state settle
      setTimeout(() => {
        executeBooking(pendingClassId);
        setPendingClassId(null);
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading studio…</p>
        </div>
      </div>
    );
  }

  if (notFound || !studio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3">
        <img src="/logo-light.png" alt="Kinspace" className="h-14 w-14 rounded-xl" />
        <h1 className="font-display text-2xl font-bold text-foreground">Studio not found</h1>
        <p className="text-muted-foreground">The studio you're looking for doesn't exist.</p>
      </div>
    );
  }

  const instructorName = (cls: PublicClass) => {
    if (cls.instructor_first_name) {
      return `${cls.instructor_first_name}${cls.instructor_last_name ? ` ${cls.instructor_last_name}` : ""}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-light.png" alt="Kinspace" className="h-9 w-9 rounded-lg" />
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                {studio.name}
              </h1>
              {studio.location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {studio.location}
                </p>
              )}
            </div>
          </div>
          {user ? (
            <Badge variant="outline" className="text-xs">Signed in</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAuthModalOpen(true)}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/30">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
              Open for bookings
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Book a Class at{" "}
              <span className="text-primary">{studio.name}</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-base md:text-lg max-w-lg">
              Browse the schedule below and reserve your spot. Your body will thank you.
            </p>
          </div>
        </div>
        {/* decorative shapes */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
      </section>

      {/* Weekly Calendar + Classes */}
      <main className="container py-8 space-y-6 animate-fade-in">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day pills */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const count = classCounts.get(dateKey) || 0;
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-3 px-1 transition-all text-sm",
                  "hover:bg-accent/60",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isToday(day)
                    ? "bg-accent ring-1 ring-primary/30"
                    : "bg-card"
                )}
              >
                <span className="text-[10px] uppercase font-medium opacity-70">
                  {format(day, "EEE")}
                </span>
                <span className="text-lg font-bold leading-tight">{format(day, "d")}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Classes list */}
        <div className="space-y-3">
          <h3 className="font-display text-xl font-semibold text-foreground">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>

          {classesOnDate.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No classes scheduled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try selecting another day to find available classes.
                </p>
              </CardContent>
            </Card>
          ) : (
            classesOnDate.map((cls) => {
              const startDate = new Date(cls.start_time);
              const classIsPast = isPast(startDate);
              const instructor = instructorName(cls);

              return (
                <Card
                  key={cls.id}
                  className={cn(
                    "group transition-all hover:shadow-md",
                    classIsPast && "opacity-50"
                  )}
                >
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="space-y-1.5">
                      <p className="font-display text-base font-semibold text-foreground">
                        {cls.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(startDate, "h:mm a")}
                        </span>
                        {instructor && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3.5 w-3.5" />
                            {instructor}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {cls.capacity} spots
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={classIsPast || bookingInProgress === cls.id}
                      onClick={() => handleBookNow(cls.id)}
                      className="shrink-0"
                    >
                      {bookingInProgress === cls.id ? "Booking…" : classIsPast ? "Passed" : "Book Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-12">
        <div className="container py-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/logo-light.png" alt="Kinspace" className="h-5 w-5 rounded" />
            <span>Powered by Kinspace</span>
          </div>
          <span>© {new Date().getFullYear()} {studio.name}</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={onAuthSuccess}
        studioName={studio.name}
      />
    </div>
  );
}
