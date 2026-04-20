import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudioThemeMaybe } from "@/components/StudioThemeProvider";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays, Ticket, X, AlertTriangle, Clock, Shield, CreditCard, Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isSameDay } from "date-fns";

interface Booking {
  id: string;
  class_id: string;
  status: string;
  class_name: string;
  start_time: string;
  created_at: string;
  instructor_name: string | null;
}

interface ActiveSubscription {
  id: string;
  product_name: string;
  access_scope: string | null;
  current_period_end: string | null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const themeCtx = useStudioThemeMaybe();
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const studioId = themeCtx?.studio?.id ?? null;

  const [firstName, setFirstName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [classPoints, setClassPoints] = useState(0);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [waitlistPositions, setWaitlistPositions] = useState<Map<string, number>>(new Map());

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isLateCancel, setIsLateCancel] = useState(false);
  const [lateCancelWindowHours, setLateCancelWindowHours] = useState(12);

  const creditsPath = studio_slug ? `/s/${studio_slug}/credits` : "/credits";

  const fetchAll = useCallback(async () => {
    if (!user || !studioId) return;
    setLoading(true);

    const [profileRes, bookingsRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("first_name, class_points").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("id, class_id, status, created_at, classes(name, start_time, instructors:instructor_id(name))")
        .eq("user_id", user.id)
        .eq("studio_id", studioId)
        .in("status", ["confirmed", "waitlist", "checked_in", "late_cancelled"])
        .order("created_at", { ascending: true }),
      supabase
        .from("user_subscriptions")
        .select("id, current_period_end, products:product_id(name, access_scope)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`),
    ]);

    setFirstName(profileRes.data?.first_name || "");
    setClassPoints(profileRes.data?.class_points ?? 0);

    // Map subscriptions
    const activeSubs: ActiveSubscription[] = (subsRes.data ?? []).map((s: any) => ({
      id: s.id,
      product_name: (s.products as any)?.name ?? "Membership",
      access_scope: (s.products as any)?.access_scope ?? null,
      current_period_end: s.current_period_end,
    }));
    setSubscriptions(activeSubs);

    // Map bookings
    const now = new Date();
    const mapped: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
      id: b.id,
      class_id: b.class_id,
      status: b.status,
      created_at: b.created_at,
      class_name: b.classes?.name ?? "Unknown Class",
      start_time: b.classes?.start_time ?? "",
      instructor_name: (b.classes?.instructors as any)?.name ?? null,
    }));
    mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const upcoming = mapped.filter((b) => new Date(b.start_time) > now && (b.status === "confirmed" || b.status === "waitlist"));
    const past = mapped
      .filter((b) => new Date(b.start_time) <= now)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 20);
    setBookings(upcoming);
    setPastBookings(past);

    // Compute waitlist positions
    const waitlisted = upcoming.filter((b) => b.status === "waitlist");
    if (waitlisted.length > 0) {
      const posMap = new Map<string, number>();
      const classIds = [...new Set(waitlisted.map((b) => b.class_id))];
      const { data: allWaitlist } = await supabase
        .from("bookings")
        .select("id, class_id, created_at")
        .in("class_id", classIds)
        .eq("status", "waitlist" as any)
        .order("created_at", { ascending: true });

      for (const wb of waitlisted) {
        const ahead = (allWaitlist ?? []).filter(
          (w: any) => w.class_id === wb.class_id && w.created_at < wb.created_at
        ).length;
        posMap.set(wb.id, ahead + 1);
      }
      setWaitlistPositions(posMap);
    } else {
      setWaitlistPositions(new Map());
    }

    setLoading(false);
  }, [user?.id, studioId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch wallet + bookings when a booking elsewhere dispatches a refresh signal
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("wallet:refresh", handler);
    return () => window.removeEventListener("wallet:refresh", handler);
  }, [fetchAll]);

  const handleCancelClick = async (booking: Booking) => {
    if (!studioId) return;
    const { data: studioData } = await supabase
      .from("studios")
      .select("late_cancel_window_hours")
      .eq("id", studioId)
      .single();
    const windowHours = (studioData as any)?.late_cancel_window_hours ?? 12;
    setLateCancelWindowHours(windowHours);
    const hoursUntilClass = (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
    setIsLateCancel(hoursUntilClass <= windowHours);
    setCancelTarget(booking);
    setCancelDialogOpen(true);
  };

  const executeCancel = async () => {
    if (!user || !cancelTarget) return;
    setCancellingId(cancelTarget.id);
    setCancelDialogOpen(false);
    const { data, error } = await supabase.rpc("cancel_booking_logic", {
      _booking_id: cancelTarget.id,
      _user_id: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const message = data as string;
      const isLate = message.includes("Late");
      toast({
        title: isLate ? "Late Cancellation" : "Cancelled",
        description: message,
        variant: isLate ? "destructive" : "default",
      });
    }
    setCancellingId(null);
    setCancelTarget(null);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasAccess = subscriptions.length > 0 || classPoints > 0;

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Welcome back{firstName ? `, ${firstName}` : ""}.
        </h2>
        <p className="mt-1 text-muted-foreground">Here's what's coming up for you.</p>
      </div>

      {/* My Access Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">My Access</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Membership Card(s) */}
          {subscriptions.map((sub) => (
            <Card key={sub.id} className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-display font-bold text-sm text-foreground">{sub.product_name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-primary/10 text-primary border-0">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      {sub.access_scope === "all_studios" ? "All Studios" : "Studio Access"}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Active</Badge>
                </div>
                {sub.current_period_end && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Renews {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Points Card */}
          <Card className={classPoints > 0
            ? "border-primary/20"
            : subscriptions.length === 0
              ? "border-destructive/20 bg-destructive/5"
              : ""
          }>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm text-foreground">Class Points</span>
                  </div>
                  <p className={`text-2xl font-bold font-display ${classPoints > 0 ? "text-primary" : "text-destructive"}`}>
                    {classPoints}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {classPoints === 1 ? "1 class remaining" : `${classPoints} classes remaining`}
                  </p>
                </div>
                <Link to={creditsPath}>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <CreditCard className="h-3 w-3" />
                    Buy More
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No Access State */}
        {!hasAccess && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                You don't have any active memberships or class points.
              </p>
              <Link to={creditsPath}>
                <Button size="sm" className="gap-1.5">
                  Get Started <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                No upcoming classes booked.
              </p>
              <Link to={studio_slug ? `/s/${studio_slug}` : "/book-class"}>
                <Button size="sm" className="gap-1.5">
                  Book a Class <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const groups: { date: Date; items: Booking[] }[] = [];
                bookings.forEach((b) => {
                  const d = new Date(b.start_time);
                  const last = groups[groups.length - 1];
                  if (last && isSameDay(last.date, d)) {
                    last.items.push(b);
                  } else {
                    groups.push({ date: d, items: [b] });
                  }
                });
                return groups.map((group) => (
                  <div key={group.date.toISOString()}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {format(group.date, "EEEE, MMMM d")}
                    </h4>
                    <div className="space-y-2">
                      {group.items.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                          {/* Time block */}
                          <div className="flex flex-col items-center justify-center w-16 shrink-0 rounded-md bg-primary/10 py-2">
                            <span className="text-lg font-bold text-primary leading-tight">
                              {format(new Date(b.start_time), "h:mm")}
                            </span>
                            <span className="text-[10px] font-medium uppercase text-primary/70">
                              {format(new Date(b.start_time), "a")}
                            </span>
                          </div>
                          {/* Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm truncate">{b.class_name}</p>
                              {b.status === "waitlist" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-2 py-0 border-amber-400 text-amber-600"
                                >
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                                  Waitlist #{waitlistPositions.get(b.id) ?? "?"}
                                </Badge>
                              )}
                            </div>
                            {b.instructor_name && (
                              <p className="text-xs text-muted-foreground">{b.instructor_name}</p>
                            )}
                          </div>
                          {/* Cancel */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            disabled={cancellingId === b.id}
                            onClick={() => handleCancelClick(b)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Classes */}
      {pastBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(() => {
                const groups: { date: Date; items: Booking[] }[] = [];
                pastBookings.forEach((b) => {
                  const d = new Date(b.start_time);
                  const last = groups[groups.length - 1];
                  if (last && isSameDay(last.date, d)) {
                    last.items.push(b);
                  } else {
                    groups.push({ date: d, items: [b] });
                  }
                });
                return groups.map((group) => (
                  <div key={group.date.toISOString()}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {format(group.date, "EEEE, MMMM d")}
                    </h4>
                    <div className="space-y-2">
                      {group.items.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                          <div className="flex flex-col items-center justify-center w-16 shrink-0 rounded-md bg-muted py-2">
                            <span className="text-lg font-bold text-muted-foreground leading-tight">
                              {format(new Date(b.start_time), "h:mm")}
                            </span>
                            <span className="text-[10px] font-medium uppercase text-muted-foreground/70">
                              {format(new Date(b.start_time), "a")}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm truncate text-foreground/80">{b.class_name}</p>
                              {b.status === "checked_in" && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-400 text-emerald-600">
                                  Attended
                                </Badge>
                              )}
                              {b.status === "late_cancelled" && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0 border-destructive/40 text-destructive">
                                  Late Cancel
                                </Badge>
                              )}
                              {b.status === "confirmed" && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0 text-muted-foreground">
                                  Completed
                                </Badge>
                              )}
                            </div>
                            {b.instructor_name && (
                              <p className="text-xs text-muted-foreground">{b.instructor_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          {isLateCancel ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Late Cancellation Warning
                </DialogTitle>
                <DialogDescription className="pt-2">
                  You are cancelling within the <strong>{lateCancelWindowHours}-hour</strong> window.
                  You will <strong>lose</strong> your credit if you proceed.
                </DialogDescription>
              </DialogHeader>
              {cancelTarget && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium">{cancelTarget.class_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(cancelTarget.start_time), "EEE, MMM d · h:mm a")}
                  </p>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Class</Button>
                <Button variant="destructive" onClick={executeCancel}>I Understand, Cancel Anyway</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Cancel Class?</DialogTitle>
                <DialogDescription className="pt-2">
                  You are outside the late cancel window. Your credit will be refunded.
                </DialogDescription>
              </DialogHeader>
              {cancelTarget && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{cancelTarget.class_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(cancelTarget.start_time), "EEE, MMM d · h:mm a")}
                  </p>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Nevermind</Button>
                <Button onClick={executeCancel}>Confirm Cancel</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
