import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Ticket, X, ExternalLink, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Booking {
  id: string;
  class_id: string;
  status: string;
  class_name: string;
  start_time: string;
  studio_id: string;
  studio_name: string;
  studio_slug: string;
}

interface StudioPass {
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  credits_remaining: number;
}

interface MyStudio {
  slug: string;
  name: string;
}

// Consistent color palette for studio badges
const STUDIO_COLORS = [
  "bg-primary/15 text-primary border-primary/30",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
];

export default function StudentPortal() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studioPasses, setStudioPasses] = useState<StudioPass[]>([]);
  const [myStudios, setMyStudios] = useState<MyStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, bookingsRes, creditsRes, studiosRes] = await Promise.all([
      supabase.from("profiles").select("first_name").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("id, class_id, status, studio_id, classes(name, start_time), studios:studio_id(name, slug)")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true }),
      supabase
        .from("student_passes")
        .select("credits_remaining, studio_id, studios:studio_id(name, slug)")
        .eq("user_id", user.id)
        .gt("credits_remaining", 0)
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("studio_members")
        .select("studios:studio_id(name, slug)")
        .eq("user_id", user.id)
        .eq("role", "student" as any),
    ]);

    setFirstName(profileRes.data?.first_name || "");

    const mapped: Booking[] = (bookingsRes.data ?? []).map((b: any) => ({
      id: b.id,
      class_id: b.class_id,
      status: b.status,
      class_name: b.classes?.name ?? "Unknown Class",
      start_time: b.classes?.start_time ?? "",
      studio_id: b.studio_id,
      studio_name: (b.studios as any)?.name ?? "",
      studio_slug: (b.studios as any)?.slug ?? "",
    }));
    mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const now = new Date();
    setBookings(mapped.filter((b) => new Date(b.start_time) > now));

    // Group passes by studio
    const passMap: Record<string, StudioPass> = {};
    (creditsRes.data ?? []).forEach((p: any) => {
      const sid = p.studio_id;
      if (!passMap[sid]) {
        passMap[sid] = {
          studio_id: sid,
          studio_name: (p.studios as any)?.name ?? "Unknown",
          studio_slug: (p.studios as any)?.slug ?? "",
          credits_remaining: 0,
        };
      }
      passMap[sid].credits_remaining += p.credits_remaining;
    });
    setStudioPasses(Object.values(passMap));

    const studios: MyStudio[] = (studiosRes.data ?? []).map((s: any) => ({
      name: (s.studios as any)?.name ?? "",
      slug: (s.studios as any)?.slug ?? "",
    })).filter((s: MyStudio) => s.slug);
    setMyStudios(studios);

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Build a stable color map for studios
  const studioColorMap = useMemo(() => {
    const ids = new Set<string>();
    bookings.forEach((b) => ids.add(b.studio_id));
    studioPasses.forEach((p) => ids.add(p.studio_id));
    const map: Record<string, string> = {};
    let i = 0;
    ids.forEach((id) => {
      map[id] = STUDIO_COLORS[i % STUDIO_COLORS.length];
      i++;
    });
    return map;
  }, [bookings, studioPasses]);

  const handleCancel = async (booking: Booking) => {
    if (!user) return;
    setCancellingId(booking.id);

    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" as any })
      .eq("id", booking.id);

    if (cancelError) {
      toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" });
      setCancellingId(null);
      return;
    }

    // Refund to earliest-expiring pass for same studio
    const { data: passes } = await supabase
      .from("student_passes")
      .select("id, credits_remaining")
      .eq("user_id", user.id)
      .eq("studio_id", booking.studio_id)
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

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl mx-auto px-4 py-8">
      {/* Greeting */}
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          Welcome back, {firstName || "Student"}.
        </h2>
        <p className="mt-1 text-muted-foreground">
          Here's what's coming up for you.
        </p>
      </div>

      {/* My Memberships — Studio-Specific Credits */}
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          My Memberships
        </h3>
        {studioPasses.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No active passes across any studio.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {studioPasses.map((sp) => (
              <Card key={sp.studio_id} className="relative overflow-hidden">
                <div className={`absolute inset-y-0 left-0 w-1 ${studioColorMap[sp.studio_id]?.split(" ")[0] ?? "bg-primary/15"}`} />
                <CardHeader className="pb-2 pl-5">
                  <CardTitle className="text-sm font-medium font-sans truncate">
                    {sp.studio_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-5 flex items-end justify-between">
                  <div>
                    <div className={`text-2xl font-bold font-display ${sp.credits_remaining > 0 ? "text-primary" : "text-destructive"}`}>
                      {sp.credits_remaining}
                    </div>
                    <p className="text-xs text-muted-foreground">credits remaining</p>
                  </div>
                   {sp.studio_slug && (
                    <div className="flex flex-col gap-1.5">
                      <Button variant="outline" size="sm" asChild className="text-xs gap-1">
                        <Link to={`/book/${sp.studio_slug}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Book a Class
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                        <Link to={`/packages/${sp.studio_slug}`}>
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Buy More
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            My Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No upcoming bookings.
            </p>
          ) : (
            <div className="divide-y">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{b.class_name}</p>
                      {b.studio_name && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 border ${studioColorMap[b.studio_id] ?? ""}`}
                        >
                          {b.studio_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.start_time), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
