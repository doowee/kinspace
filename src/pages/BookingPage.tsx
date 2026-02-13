import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Users, MapPin, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/booking/AuthModal";
import type { User } from "@supabase/supabase-js";

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
  instructor_first_name: string | null;
  instructor_last_name: string | null;
}

export default function BookingPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const { toast } = useToast();
  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Auth & booking state
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [noCreditsOpen, setNoCreditsOpen] = useState(false);
  const [bookingClassId, setBookingClassId] = useState<string | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [userBookedClassIds, setUserBookedClassIds] = useState<Set<string>>(new Set());
  const [pendingBookClass, setPendingBookClass] = useState<PublicClass | null>(null);

  // Listen to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    supabase.auth.getSession().then(({ data: { session } }) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Fetch studio & classes
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

  // Fetch booking data when user or studio changes
  useEffect(() => {
    if (!studio || !user) {
      setBookingCounts({});
      setUserBookedClassIds(new Set());
      return;
    }
    const fetchBookings = async () => {
      // Need to be a studio member to query bookings
      // For public page, we query via user's own bookings
      const { data: myBookings } = await supabase
        .from("bookings")
        .select("class_id, status")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "waitlist"]);

      setUserBookedClassIds(new Set(myBookings?.map((b) => b.class_id) ?? []));
    };
    fetchBookings();
  }, [studio?.id, user?.id, classes]);

  // Handle "Book Now" click — after auth success retry pending
  useEffect(() => {
    if (user && pendingBookClass) {
      handleBook(pendingBookClass);
      setPendingBookClass(null);
    }
  }, [user]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const classesOnDate = classes.filter((c) =>
    isSameDay(new Date(c.start_time), selectedDate)
  );

  const handleBookClick = (cls: PublicClass) => {
    if (!user) {
      setPendingBookClass(cls);
      setAuthModalOpen(true);
      return;
    }
    handleBook(cls);
  };

  const handleBook = async (cls: PublicClass) => {
    if (!user || !studio) return;
    setBookingClassId(cls.id);

    try {
      // Check for active student pass with credits
      const { data: passes } = await supabase
        .from("student_passes")
        .select("id, credits_remaining, expires_at")
        .eq("user_id", user.id)
        .eq("studio_id", studio.id)
        .gt("credits_remaining", 0)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .limit(1);

      if (!passes || passes.length === 0) {
        setBookingClassId(null);
        setNoCreditsOpen(true);
        return;
      }

      const pass = passes[0];

      // Decrement credits
      const { error: passError } = await supabase
        .from("student_passes")
        .update({ credits_remaining: pass.credits_remaining - 1 })
        .eq("id", pass.id);
      if (passError) throw passError;

      // Insert booking
      const { error: bookError } = await supabase.from("bookings").insert({
        studio_id: studio.id,
        user_id: user.id,
        class_id: cls.id,
        status: "confirmed",
      });
      if (bookError) throw bookError;

      toast({
        title: "Success! You are booked",
        description: `You're confirmed for ${cls.name}.`,
      });

      setUserBookedClassIds((prev) => new Set([...prev, cls.id]));
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound || !studio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-2">
        <img src="/kinspace-logo-sage.png" alt="Kinspace" className="h-12 w-12 mb-4 rounded-lg" />
        <h1 className="font-display text-2xl font-bold text-foreground">Studio not found</h1>
        <p className="text-muted-foreground">The studio you're looking for doesn't exist.</p>
      </div>
    );
  }

  const instructorName = (cls: PublicClass) => {
    if (cls.instructor_first_name || cls.instructor_last_name) {
      return [cls.instructor_first_name, cls.instructor_last_name].filter(Boolean).join(" ");
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex h-16 items-center gap-3">
          <img
            src="/kinspace-logo-sage.png"
            alt="Kinspace"
            className="h-9 w-9 rounded-lg"
          />
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
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary/10 border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="container relative py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">
            Book a Class
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground max-w-lg leading-tight">
            Your practice,{" "}
            <span className="text-primary">your schedule.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Browse the schedule below and reserve your spot in just a few taps.
          </p>
        </div>
      </section>

      {/* Schedule */}
      <main className="container py-10 animate-fade-in">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold text-foreground">
            {format(weekStart, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                setSelectedDate(today);
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day Tabs */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {weekDays.map((day) => {
            const hasClasses = classes.some((c) =>
              isSameDay(new Date(c.start_time), day)
            );
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-3 px-1 transition-all text-center",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-accent",
                  isToday(day) && !isSelected && "ring-2 ring-primary/30"
                )}
              >
                <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">
                  {format(day, "EEE")}
                </span>
                <span className="text-lg font-bold">{format(day, "d")}</span>
                {hasClasses && !isSelected && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day */}
        <h4 className="font-display text-lg font-semibold mb-4 text-foreground">
          {format(selectedDate, "EEEE, MMMM d")}
        </h4>

        {classesOnDate.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                No classes scheduled for this day.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {classesOnDate.map((cls) => {
              const isBooked = userBookedClassIds.has(cls.id);
              const isBooking = bookingClassId === cls.id;
              const instructor = instructorName(cls);

              return (
                <Card
                  key={cls.id}
                  className={cn(
                    "overflow-hidden transition-shadow hover:shadow-lg",
                    isBooked && "ring-2 ring-primary/30"
                  )}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Time strip */}
                      <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-primary/10 py-5">
                        <span className="text-xs font-medium uppercase text-primary/70">
                          {format(new Date(cls.start_time), "a")}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {format(new Date(cls.start_time), "h:mm")}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 items-center justify-between gap-3 p-4">
                        <div className="space-y-1 min-w-0">
                          <p className="font-display font-bold text-foreground truncate">
                            {cls.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {instructor && (
                              <span>{instructor}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {cls.capacity} spots
                            </span>
                          </div>
                        </div>

                        {isBooked ? (
                          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Booked
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="shrink-0"
                            disabled={isBooking}
                            onClick={() => handleBookClick(cls)}
                          >
                            {isBooking ? "Booking…" : "Book Now"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-8 mt-12">
        <div className="container flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <img src="/kinspace-logo-sage.png" alt="" className="h-4 w-4 rounded" />
          <span>Powered by Kinspace</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={() => {}}
      />

      {/* No Credits Modal */}
      <Dialog open={noCreditsOpen} onOpenChange={setNoCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">No Credits Available</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You don't have any active credits to book this class. Purchase a
            package to get started.
          </p>
          <Button className="w-full mt-2" onClick={() => setNoCreditsOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
