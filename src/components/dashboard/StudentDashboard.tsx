import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Ticket, X } from "lucide-react";
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

  const fetchAll = useCallback(async () => {
    if (!user || !activeStudio) return;
    setLoading(true);

    // Parallel fetches
    const [profileRes, bookingsRes, creditsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single(),
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
    // Sort by start_time ascending
    mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    setBookings(mapped);

    const sum = (creditsRes.data ?? []).reduce(
      (acc: number, p: any) => acc + p.credits_remaining,
      0
    );
    setTotalCredits(sum);
    setLoading(false);
  }, [user?.id, activeStudio?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCancel = async (booking: Booking) => {
    if (!user || !activeStudio) return;
    setCancellingId(booking.id);

    // 1. Cancel the booking
    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" as any })
      .eq("id", booking.id);

    if (cancelError) {
      toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" });
      setCancellingId(null);
      return;
    }

    // 2. Refund credit to earliest-expiring active pass
    const { data: passes } = await supabase
      .from("student_passes")
      .select("id, credits_remaining")
      .eq("user_id", user.id)
      .eq("studio_id", activeStudio.id)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(1);

    if (passes && passes.length > 0) {
      await supabase
        .from("student_passes")
        .update({ credits_remaining: passes[0].credits_remaining + 1 })
        .eq("id", passes[0].id);
    }

    toast({ title: "Cancelled", description: "Booking cancelled and credit refunded." });
    setCancellingId(null);
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
                        onClick={() => handleCancel(b)}
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
    </div>
  );
}
