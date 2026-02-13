import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarDays, Ticket, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Booking {
  id: string;
  class_id: string;
  status: string;
  class_name: string;
  start_time: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { activeStudio } = useStudio();
  const [firstName, setFirstName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isLateCancel, setIsLateCancel] = useState(false);
  const [lateCancelWindowHours, setLateCancelWindowHours] = useState(12);

  const fetchAll = useCallback(async () => {
    if (!user || !activeStudio) return;
    setLoading(true);

    const [profileRes, bookingsRes, creditsRes] = await Promise.all([
      supabase.from("profiles").select("first_name").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("id, class_id, status, classes(name, start_time)")
        .eq("user_id", user.id)
        .eq("studio_id", activeStudio.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true }),
      supabase
        .from("student_passes")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .eq("studio_id", activeStudio.id)
        .gt("credits_remaining", 0)
        .gt("expires_at", new Date().toISOString()),
    ]);

    setFirstName(profileRes.data?.first_name || "");

    const mapped: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
      id: b.id,
      class_id: b.class_id,
      status: b.status,
      class_name: b.classes?.name ?? "Unknown Class",
      start_time: b.classes?.start_time ?? "",
    }));
    mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    setBookings(mapped);

    const sum = (creditsRes.data ?? []).reduce((acc: number, p: any) => acc + p.credits_remaining, 0);
    setTotalCredits(sum);
    setLoading(false);
  }, [user?.id, activeStudio?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCancelClick = async (booking: Booking) => {
    if (!activeStudio) return;

    const { data: studioData } = await supabase
      .from("studios")
      .select("late_cancel_window_hours")
      .eq("id", activeStudio.id)
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

  const now = new Date();
  const nextClass = bookings.find((b) => new Date(b.start_time) > now);

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Welcome back{firstName ? `, ${firstName}` : ""}.
        </h2>
        <p className="mt-1 text-muted-foreground">
          Here's what's coming up for you.
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Next Class</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextClass ? (
              <>
                <div className="text-xl font-bold font-display">{nextClass.class_name}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(nextClass.start_time), "EEE, MMM d · h:mm a")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming classes</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Wallet</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-display ${totalCredits > 0 ? "text-primary" : "text-destructive"}`}>
              {totalCredits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">credits remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* My Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">My Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No confirmed bookings yet.
            </p>
          ) : (
            <div className="divide-y">
              {bookings.map((b) => {
                const isPast = new Date(b.start_time) < now;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.class_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.start_time), "EEE, MMM d · h:mm a")}
                      </p>
                    </div>
                    {!isPast && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-4"
                        disabled={cancellingId === b.id}
                        onClick={() => handleCancelClick(b)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                    {isPast && (
                      <Badge variant="secondary" className="text-xs shrink-0 ml-4">
                        Completed
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                  Keep Class
                </Button>
                <Button variant="destructive" onClick={executeCancel}>
                  I Understand, Cancel Anyway
                </Button>
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
                <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                  Nevermind
                </Button>
                <Button onClick={executeCancel}>
                  Confirm Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
