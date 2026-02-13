import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ManualBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  className: string;
  studioId: string;
  organizationId: string | null;
  onBooked: () => void;
}

interface StudentResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export default function ManualBookDialog({ open, onOpenChange, classId, className, studioId, organizationId, onBooked }: ManualBookDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);

      // Get all studios in the org, or fall back to current studio
      let studioIds: string[] = [studioId];
      if (organizationId) {
        const { data: orgStudios } = await supabase
          .from("studios")
          .select("id")
          .eq("organization_id", organizationId);
        if (orgStudios && orgStudios.length > 0) {
          studioIds = orgStudios.map((s) => s.id);
        }
      }

      // Search members across all org studios
      const { data: members } = await supabase
        .from("studio_members")
        .select("user_id")
        .in("studio_id", studioIds)
        .eq("role", "student");

      if (!members || members.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds)
        .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);

      setResults((profiles as StudentResult[]) ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, studioId, organizationId]);

  const handleBook = async (student: StudentResult) => {
    if (!classId) return;
    setBooking(true);

    try {
      const { error } = await supabase.from("bookings").insert({
        studio_id: studioId,
        user_id: student.id,
        class_id: classId,
        status: "confirmed",
      });

      if (error) throw error;

      toast({
        title: "Student booked",
        description: `${student.first_name || student.email} has been booked for ${className}.`,
      });
      onOpenChange(false);
      onBooked();
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const displayName = (s: StudentResult) => {
    if (s.first_name || s.last_name) return [s.first_name, s.last_name].filter(Boolean).join(" ");
    return s.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Manual Book — {className}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="student-search">Search Student</Label>
            <Input
              id="student-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              autoFocus
            />
          </div>

          {searching && <p className="text-sm text-muted-foreground animate-pulse">Searching…</p>}

          {results.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {results.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  onClick={() => handleBook(s)}
                  disabled={booking}
                >
                  <div>
                    <p className="font-medium text-foreground">{displayName(s)}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Book</span>
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && !searching && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No students found matching "{search}".</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
