import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudioTheme } from "@/components/StudioThemeProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clock, Users, MapPin, ChevronLeft, ChevronRight, CheckCircle2, ShoppingBag, PartyPopper, LayoutDashboard, User as UserIcon, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/booking/AuthModal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from "@supabase/supabase-js";

interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_highlight: string;
}

interface PublicClass {
  id: string;
  name: string;
  start_time: string;
  capacity: number;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
  description: string | null;
  instructor_bio: string | null;
}

export default function BookingPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const { studio: themeStudio, loading: themeLoading, notFound: themeNotFound } = useStudioTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const studio = themeStudio as StudioInfo | null;
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const loading = themeLoading || classesLoading;
  const notFound = themeNotFound;

  // Auth & booking state
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [noCreditsOpen, setNoCreditsOpen] = useState(false);
  const [bookingClassId, setBookingClassId] = useState<string | null>(null);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [userBookedClassIds, setUserBookedClassIds] = useState<Map<string, string>>(new Map());
  const [pendingBookClass, setPendingBookClass] = useState<PublicClass | null>(null);
  const [successClass, setSuccessClass] = useState<PublicClass | null>(null);
  const [detailClass, setDetailClass] = useState<PublicClass | null>(null);

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

  // Fetch classes when studio is available
  useEffect(() => {
    if (!studio_slug || !studio) return;
    const fetchClasses = async () => {
      setClassesLoading(true);
      const { data: classData } = await supabase.rpc(
        "get_public_classes_by_studio_slug",
        { _slug: studio_slug }
      );
      setClasses((classData as PublicClass[]) ?? []);
      setClassesLoading(false);
    };
    fetchClasses();
  }, [studio_slug, studio?.id]);

  // Fetch booking data when user or studio changes
  useEffect(() => {
    if (!studio || !user) {
      setBookingCounts({});
      setUserBookedClassIds(new Map());
      return;
    }
    const fetchBookings = async () => {
      const { data: myBookings } = await supabase
        .from("bookings")
        .select("class_id, status")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "waitlist"]);

      const map = new Map<string, string>();
      myBookings?.forEach((b) => map.set(b.class_id, b.status));
      setUserBookedClassIds(map);
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

  const handleBookClick = (cls: PublicClass, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

      // Check capacity
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("class_id", cls.id)
        .eq("status", "confirmed");

      const isFull = (count ?? 0) >= cls.capacity;
      const bookingStatus = isFull ? "waitlist" : "confirmed";

      const { error: passError } = await supabase
        .from("student_passes")
        .update({ credits_remaining: pass.credits_remaining - 1 })
        .eq("id", pass.id);
      if (passError) throw passError;

      const { error: bookError } = await supabase.from("bookings").insert({
        studio_id: studio.id,
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

      setUserBookedClassIds((prev) => new Map([...prev, [cls.id, bookingStatus]]));
      setDetailClass(null);
      if (!isFull) setSuccessClass(cls);
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Browser tab title */}
      {(() => { document.title = `${studio.name} | Booking`; return null; })()}

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {studio.logo_url ? (
              <img
                src={studio.logo_url}
                alt={studio.name}
                className="h-9 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <span className="font-display text-xl font-bold text-foreground">
                {studio.name}
              </span>
            )}
            {studio.logo_url && (
              <div>
                <h1 className="font-display text-lg font-bold text-foreground leading-tight">
                  {studio.name}
                </h1>
              </div>
            )}
            {studio.location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {studio.location}
              </p>
            )}
          </div>
          {user && (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              My Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Compact Hero */}
      <section className="relative overflow-hidden bg-primary/10 border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="container relative py-8 md:py-10">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Book a Class
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Browse the weekly schedule below and reserve your spot.
          </p>
        </div>
      </section>

      {/* Schedule */}
      <main className="container py-8 animate-fade-in">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold text-foreground">
            {format(weekStart, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
              disabled={isBefore(addDays(weekStart, -1), startOfDay(new Date()))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={weekStart}
                  onSelect={(d) => d && setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Day Strip */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {weekDays.map((day) => {
            const hasClasses = classes.some((c) =>
              isSameDay(new Date(c.start_time), day)
            );
            const dayPast = isBefore(day, startOfDay(new Date()));
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  const el = document.getElementById(`day-${format(day, "yyyy-MM-dd")}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "flex flex-col items-center rounded-xl py-3 px-1 transition-all text-center",
                  isToday(day)
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-accent",
                  dayPast && !isToday(day) && "opacity-40"
                )}
              >
                <span className="text-[10px] uppercase tracking-wider font-medium opacity-70">
                  {format(day, "EEE")}
                </span>
                <span className="text-lg font-bold">{format(day, "d")}</span>
                {hasClasses && !isToday(day) && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* All 7 days listed */}
        <div className="space-y-8">
          {weekDays.map((day) => {
            const dayPast = isBefore(day, startOfDay(new Date()));
            const dayClasses = classes
              .filter((c) => isSameDay(new Date(c.start_time), day))
              .filter((c) => !dayPast || !isBefore(new Date(c.start_time), new Date()));

            if (dayPast && dayClasses.length === 0) return null;

            return (
              <section key={day.toISOString()} id={`day-${format(day, "yyyy-MM-dd")}`}>
                <div className="flex items-center gap-3 mb-3">
                  <h4
                    className={cn(
                      "font-display text-lg font-semibold",
                      isToday(day) && "text-primary"
                    )}
                  >
                    {format(day, "EEEE, MMMM d")}
                  </h4>
                  {isToday(day) && (
                    <Badge variant="secondary" className="text-xs">Today</Badge>
                  )}
                </div>

                {dayClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-1">No classes scheduled.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {dayClasses.map((cls) => {
                      const bookingStatus = userBookedClassIds.get(cls.id);
                      const isBooked = !!bookingStatus;
                      const isWaitlisted = bookingStatus === "waitlist";
                      const isBooking = bookingClassId === cls.id;
                      const instructor = instructorName(cls);

                      return (
                        <Card
                          key={cls.id}
                          className={cn(
                            "overflow-hidden transition-shadow hover:shadow-lg cursor-pointer",
                            isBooked && !isWaitlisted && "ring-2 ring-primary/30",
                            isWaitlisted && "ring-2 ring-amber-400/30"
                          )}
                          onClick={() => setDetailClass(cls)}
                        >
                          <CardContent className="p-0">
                            <div className="flex">
                              <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-primary/10 py-5">
                                <span className="text-xs font-medium uppercase text-primary/70">
                                  {format(new Date(cls.start_time), "a")}
                                </span>
                                <span className="text-2xl font-bold text-primary">
                                  {format(new Date(cls.start_time), "h:mm")}
                                </span>
                              </div>

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

                                {isWaitlisted ? (
                                  <Badge variant="outline" className="shrink-0 border-amber-400 text-amber-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Waitlisted
                                  </Badge>
                                ) : isBooked ? (
                                  <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Booked
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="shrink-0"
                                    disabled={isBooking}
                                    onClick={(e) => handleBookClick(cls, e)}
                                  >
                                    {isBooking ? "Booking…" : "Book"}
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
              </section>
            );
          })}
        </div>
      </main>

      {/* Powered by Footer */}
      <footer className="border-t bg-card/50 py-6 mt-auto">
        <div className="container flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <span>Powered by</span>
          <a
            href="https://kinspace.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-muted-foreground transition-colors"
          >
            Kinspace.studio
          </a>
        </div>
      </footer>

      {/* Class Detail Dialog */}
      <Dialog open={!!detailClass} onOpenChange={(open) => !open && setDetailClass(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailClass && (() => {
            const instructor = instructorName(detailClass);
            const bookingStatus = userBookedClassIds.get(detailClass.id);
            const isBooked = !!bookingStatus;
            const isWaitlisted = bookingStatus === "waitlist";
            const isBooking = bookingClassId === detailClass.id;
            const classPast = isBefore(new Date(detailClass.start_time), new Date());

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">{detailClass.name}</DialogTitle>
                  <DialogDescription>
                    {format(new Date(detailClass.start_time), "EEEE, MMMM d 'at' h:mm a")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {detailClass.description && (
                    <p className="text-sm text-muted-foreground">{detailClass.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {format(new Date(detailClass.start_time), "h:mm a")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {detailClass.capacity} spots
                    </span>
                  </div>

                  {instructor && (
                    <div className="rounded-lg border p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{instructor}</span>
                      </div>
                      {detailClass.instructor_bio && (
                        <p className="text-xs text-muted-foreground pl-10">{detailClass.instructor_bio}</p>
                      )}
                    </div>
                  )}

                  {isWaitlisted ? (
                    <Badge variant="outline" className="border-amber-400 text-amber-600 w-full justify-center py-2">
                      <Clock className="h-4 w-4 mr-2" />
                      You're on the waitlist — we'll notify you if a spot opens
                    </Badge>
                  ) : isBooked ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 w-full justify-center py-2">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      You're booked for this class
                    </Badge>
                  ) : !classPast ? (
                    <Button
                      className="w-full"
                      disabled={isBooking}
                      onClick={() => handleBookClick(detailClass)}
                    >
                      {isBooking ? "Booking…" : "Book This Class"}
                    </Button>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground">This class has already passed.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
            <DialogTitle className="font-display flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Pass Required
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You need a class pass to book this session. Browse available packages and grab some credits.
          </p>
          <Button
            className="w-full mt-2 gap-2"
            onClick={() => {
              setNoCreditsOpen(false);
              navigate(`/book/${studio_slug}/packages?return_url=/book/${studio_slug}`);
            }}
          >
            View Packages
          </Button>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!successClass} onOpenChange={(open) => !open && setSuccessClass(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle className="font-display text-2xl">You're Booked!</DialogTitle>
              <DialogDescription className="text-center">
                You are confirmed for <span className="font-semibold text-foreground">{successClass?.name}</span> on{" "}
                <span className="font-semibold text-foreground">
                  {successClass ? format(new Date(successClass.start_time), "EEEE, MMMM d 'at' h:mm a") : ""}
                </span>
                . A confirmation email has been sent.
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button className="w-full" onClick={() => { setSuccessClass(null); navigate("/dashboard"); }}>
                Go to My Dashboard
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setSuccessClass(null)}>
                Book Another Class
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}