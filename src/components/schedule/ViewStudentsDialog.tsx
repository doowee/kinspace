import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoPhone } from "@/contexts/DemoPhoneContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Zap } from "lucide-react";

interface Booking {
  id: string;
  status: string;
  user_id: string;
  created_at: string;
  studio_id: string;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface ViewStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  className: string;
  capacity: number;
  classStartTime?: string;
}

export default function ViewStudentsDialog({ open, onOpenChange, classId, className, capacity, classStartTime }: ViewStudentsDialogProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const { triggerWaitlistPromotion, onWaitlistPromoted } = useDemoPhone();

  const fetchBookings = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, status, user_id, created_at, studio_id, profiles:user_id(first_name, last_name, email)")
      .eq("class_id", classId)
      .in("status", ["confirmed", "waitlist", "checked_in"])
      .order("created_at");
    setBookings((data as unknown as Booking[]) ?? []);
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    if (!open || !classId) return;
    fetchBookings();
  }, [open, classId, fetchBookings]);

  // Register refetch callback so DemoPhone can trigger it
  useEffect(() => {
    onWaitlistPromoted.current = fetchBookings;
    return () => {
      onWaitlistPromoted.current = null;
    };
  }, [fetchBookings, onWaitlistPromoted]);

  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
  const waitlisted = bookings.filter((b) => b.status === "waitlist");

  const studentName = (b: Booking) => {
    const p = b.profiles;
    if (p?.first_name || p?.last_name) return [p.first_name, p.last_name].filter(Boolean).join(" ");
    return p?.email || "Unknown";
  };

  const handleSimulateWaitlist = () => {
    const first = waitlisted[0];
    if (!first) return;
    triggerWaitlistPromotion({
      bookingId: first.id,
      userId: first.user_id,
      studioId: first.studio_id,
      className,
      classTime: classStartTime || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {className}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students booked yet.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Confirmed ({confirmed.length}/{capacity})
              </p>
              <div className="space-y-1">
                {confirmed.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="text-foreground">{studentName(b)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {b.status === "checked_in" ? "Checked In" : "Confirmed"}
                    </Badge>
                  </div>
                ))}
                {confirmed.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
              </div>
            </div>

            {waitlisted.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Waitlist ({waitlisted.length})</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={handleSimulateWaitlist}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Simulate Waitlist Opening
                  </Button>
                </div>
                <div className="space-y-1">
                  {waitlisted.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="text-foreground">{studentName(b)}</span>
                      <Badge variant="outline" className="text-xs">Waitlist</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
