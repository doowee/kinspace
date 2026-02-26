import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarDays, X, Ticket, ExternalLink, AlertTriangle, RotateCw, CalendarPlus, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { findNextClassInstance, type NextClassInstance } from "@/lib/rebook-helpers";

interface Booking {
  id: string;
  class_id: string;
  status: string;
  class_name: string;
  start_time: string;
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  instructor_name: string | null;
}

const STUDIO_COLORS = [
  "bg-primary/15 text-primary border-primary/30",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
];

export default function StudentPortal({ demoUserId }: { demoUserId?: string }) {
  const { user } = useAuth();
  const effectiveUserId = demoUserId || user?.id;
  const [firstName, setFirstName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [classPoints, setClassPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isLateCancel, setIsLateCancel] = useState(false);
  const [lateCancelWindowHours, setLateCancelWindowHours] = useState(12);

  const [rebookDialogOpen, setRebookDialogOpen] = useState(false);
  const [rebookLoading, setRebookLoading] = useState(false);
  const [rebookCandidate, setRebookCandidate] = useState<NextClassInstance | null>(null);
  const [rebookSourceBooking, setRebookSourceBooking] = useState<Booking | null>(null);
  const [rebookConfirming, setRebookConfirming] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);

    const [profileRes, bookingsRes] = await Promise.all([
      supabase.from("profiles").select("first_name, class_points").eq("id", effectiveUserId).single(),
      supabase
        .from("bookings")
        .select("id, class_id, status, studio_id, classes(name, start_time, instructors:instructor_id(name)), studios:studio_id(name, slug)")
        .eq("user_id", effectiveUserId)
        .in("status", ["confirmed", "checked_in", "waitlist"])
        .order("created_at", { ascending: true }),
    ]);

    setFirstName(profileRes.data?.first_name || "");
    setClassPoints(profileRes.data?.class_points ?? 0);

    const mapped: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
      id: b.id, class_id: b.class_id, status: b.status,
      class_name: b.classes?.name ?? "Unknown Class",
      start_time: b.classes?.start_time ?? "",
      studio_id: b.studio_id,
      studio_name: (b.studios as any)?.name ?? "",
      studio_slug: (b.studios as any)?.slug ?? "",
      instructor_name: (b.classes?.instructors as any)?.name ?? null,
    }));
    mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const now = new Date();
    setBookings(mapped.filter((b) => new Date(b.start_time) > now));
    setPastBookings(mapped.filter((b) => new Date(b.start_time) <= now).reverse().slice(0, 10));
    setLoading(false);
  }, [effectiveUserId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const studioColorMap = useMemo(() => {
    const ids = new Set<string>();
    bookings.forEach((b) => ids.add(b.studio_id));
    pastBookings.forEach((b) => ids.add(b.studio_id));
    const map: Record<string, string> = {};
    let i = 0;
    ids.forEach((id) => { map[id] = STUDIO_COLORS[i % STUDIO_COLORS.length]; i++; });
    return map;
  }, [bookings, pastBookings]);

  const handleCancelClick = async (booking: Booking) => {
    const { data: studioData } = await supabase.from("studios").select("late_cancel_window_hours").eq("id", booking.studio_id).single();
    const windowHours = (studioData as any)?.late_cancel_window_hours ?? 12;
    setLateCancelWindowHours(windowHours);
    const hoursUntilClass = (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
    setIsLateCancel(hoursUntilClass <= windowHours);
    setCancelTarget(booking);
    setCancelDialogOpen(true);
  };

  const executeCancel = async () => {
    if (!effectiveUserId || !cancelTarget) return;
    setCancellingId(cancelTarget.id);
    setCancelDialogOpen(false);
    const { data, error } = await supabase.rpc("cancel_booking_logic", { _booking_id: cancelTarget.id, _user_id: effectiveUserId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { const message = data as string; toast({ title: message.includes("Late") ? "Late Cancellation" : "Cancelled", description: message, variant: message.includes("Late") ? "destructive" : "default" }); }
    setCancellingId(null); setCancelTarget(null); fetchAll();
  };

  const handleRebook = async (booking: Booking, afterCurrentClass: boolean) => {
    setRebookLoading(true); setRebookSourceBooking(booking);
    const preferredHour = new Date(booking.start_time).getHours();
    const afterDate = afterCurrentClass ? booking.start_time : undefined;
    const result = await findNextClassInstance(booking.class_name, booking.studio_id, afterDate, preferredHour);
    setRebookLoading(false);
    if (!result) { toast({ title: "No classes found", description: `No upcoming "${booking.class_name}" found.` }); setRebookSourceBooking(null); return; }
    setRebookCandidate(result); setRebookDialogOpen(true);
  };

  const confirmRebook = async () => {
    if (!effectiveUserId || !rebookCandidate || !rebookSourceBooking) return;
    setRebookConfirming(true);
    const { error: bookingError } = await supabase.from("bookings").insert({
      user_id: effectiveUserId, class_id: rebookCandidate.id, studio_id: rebookSourceBooking.studio_id, status: "confirmed",
    });
    if (bookingError) {
      if (bookingError.code === "23505") toast({ title: "Already booked", variant: "destructive" });
      else toast({ title: "Error", description: bookingError.message, variant: "destructive" });
      setRebookConfirming(false); return;
    }
    toast({ title: "Booked!", description: `${rebookCandidate.name} on ${format(new Date(rebookCandidate.start_time), "EEE, MMM d · h:mm a")}` });
    setRebookConfirming(false); setRebookDialogOpen(false); setRebookCandidate(null); setRebookSourceBooking(null); fetchAll();
  };

  if (loading) return (<div className="flex items-center justify-center py-16"><div className="animate-pulse text-muted-foreground">Loading...</div></div>);

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl mx-auto px-4 py-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Welcome back, {firstName || "Student"}.</h2>
        <p className="mt-1 text-muted-foreground">Here's what's coming up for you.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold font-display text-primary">{bookings.length}</div><p className="text-xs text-muted-foreground">Upcoming Classes</p></CardContent></Card>
        <Link to="/wallet">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold font-display text-primary flex items-center justify-center gap-1"><Ticket className="h-5 w-5" />{classPoints}</div>
              <p className="text-xs text-muted-foreground">Class Points</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><CalendarDays className="h-5 w-5" />My Schedule</CardTitle></CardHeader>
        <CardContent>
          {bookings.length === 0 ? (<p className="text-sm text-muted-foreground py-4 text-center">No upcoming bookings.</p>) : (
            <div className="divide-y">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{b.class_name}</p>
                      {b.studio_name && <Badge variant="outline" className={`text-[10px] px-2 py-0 border ${studioColorMap[b.studio_id] ?? ""}`}>{b.studio_name}</Badge>}
                      {b.status === "waitlist" && <Badge variant="outline" className="text-[10px] px-2 py-0 border border-amber-400 text-amber-600"><Clock className="h-2.5 w-2.5 mr-0.5" />Waitlisted</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{b.instructor_name && <span>{b.instructor_name} · </span>}{format(new Date(b.start_time), "EEE, MMM d · h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 text-xs gap-1" disabled={rebookLoading && rebookSourceBooking?.id === b.id} onClick={() => handleRebook(b, true)} title="Book the next session"><CalendarPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Next Session</span></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={cancellingId === b.id} onClick={() => handleCancelClick(b)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pastBookings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2 text-muted-foreground"><RotateCw className="h-5 w-5" />Past Classes</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {pastBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate text-muted-foreground">{b.class_name}</p>
                      {b.studio_name && <Badge variant="outline" className="text-[10px] px-2 py-0 opacity-60">{b.studio_name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(b.start_time), "EEE, MMM d · h:mm a")}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 text-xs gap-1 shrink-0" disabled={rebookLoading && rebookSourceBooking?.id === b.id} onClick={() => handleRebook(b, false)}><CalendarPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Rebook</span></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          {isLateCancel ? (<>
            <DialogHeader><DialogTitle className="font-display flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Late Cancellation Warning</DialogTitle><DialogDescription className="pt-2">You are cancelling within the <strong>{lateCancelWindowHours}-hour</strong> window.</DialogDescription></DialogHeader>
            {cancelTarget && <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm"><p className="font-medium">{cancelTarget.class_name}</p><p className="text-xs text-muted-foreground">{format(new Date(cancelTarget.start_time), "EEE, MMM d · h:mm a")}</p></div>}
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Class</Button><Button variant="destructive" onClick={executeCancel}>Cancel Anyway</Button></DialogFooter>
          </>) : (<>
            <DialogHeader><DialogTitle className="font-display">Cancel Class?</DialogTitle><DialogDescription className="pt-2">Your credit will be refunded.</DialogDescription></DialogHeader>
            {cancelTarget && <div className="rounded-md border bg-muted/50 p-3 text-sm"><p className="font-medium">{cancelTarget.class_name}</p><p className="text-xs text-muted-foreground">{format(new Date(cancelTarget.start_time), "EEE, MMM d · h:mm a")}</p></div>}
            <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Nevermind</Button><Button onClick={executeCancel}>Confirm Cancel</Button></DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Rebook Dialog */}
      <Dialog open={rebookDialogOpen} onOpenChange={(open) => { if (!open) { setRebookDialogOpen(false); setRebookCandidate(null); setRebookSourceBooking(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary" />Book Next Available?</DialogTitle><DialogDescription className="pt-2">We found the next available session for you.</DialogDescription></DialogHeader>
          {rebookCandidate && (
            <div className="rounded-md border bg-primary/5 border-primary/20 p-4 space-y-1">
              <p className="font-semibold text-sm">{rebookCandidate.name}</p>
              {rebookCandidate.instructor_name && <p className="text-xs text-muted-foreground">with {rebookCandidate.instructor_name}</p>}
              <p className="text-sm font-medium text-primary">{format(new Date(rebookCandidate.start_time), "EEEE, MMM d · h:mm a")}</p>
              <p className="text-xs text-muted-foreground">{rebookCandidate.current_bookings}/{rebookCandidate.capacity} spots filled</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" onClick={() => setRebookDialogOpen(false)}>Cancel</Button><Button onClick={confirmRebook} disabled={rebookConfirming}>{rebookConfirming ? "Booking…" : "Confirm Booking"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
