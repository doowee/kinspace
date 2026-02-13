import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Booking {
  id: string;
  status: string;
  user_id: string;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface ViewStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  className: string;
  capacity: number;
}

export default function ViewStudentsDialog({ open, onOpenChange, classId, className, capacity }: ViewStudentsDialogProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !classId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, status, user_id, profiles:user_id(first_name, last_name, email)")
        .eq("class_id", classId)
        .in("status", ["confirmed", "waitlist"])
        .order("created_at");
      setBookings((data as unknown as Booking[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [open, classId]);

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const waitlisted = bookings.filter((b) => b.status === "waitlist");

  const studentName = (b: Booking) => {
    const p = b.profiles;
    if (p?.first_name || p?.last_name) return [p.first_name, p.last_name].filter(Boolean).join(" ");
    return p?.email || "Unknown";
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
                    <Badge variant="secondary" className="text-xs">Confirmed</Badge>
                  </div>
                ))}
                {confirmed.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
              </div>
            </div>

            {waitlisted.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Waitlist ({waitlisted.length})</p>
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
