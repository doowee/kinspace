import { useDemoPhone } from "@/contexts/DemoPhoneContext";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Zap, Bell, Users, AlertTriangle, RotateCcw, Database, MessageSquare, CreditCard, Flame, Lock } from "lucide-react";
import { seedDemoData } from "@/lib/seed-demo-data";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function DemoTriggers() {
  const { activeRole, activeStudio } = useStudio();
  const { triggerScenario, triggerWaitlistPromotion, onWaitlistPromoted, clearMessages } = useDemoPhone();
  const queryClient = useQueryClient();
  const { isPro } = useSubscriptionTier();

  const studioName = activeStudio?.name || "Your Studio";
  const studioId = activeStudio?.id;

  // Only visible to owners
  if (activeRole !== "owner") return null;

  const handleSeedDemoData = async () => {
    if (!window.confirm("Reset & re-seed the demo studio? This regenerates classes, students, bookings, and transactions.")) {
      return;
    }
    try {
      toast({ title: "Seeding…", description: "Creating demo data, please wait." });
      const result = await seedDemoData("11111111-1111-1111-1111-111111111111");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      toast({
        title: "Demo Environment Initialized ✓",
        description: `${result.classCount} Classes, ${result.studentCount} Students, ${result.bookingCount} Bookings, ${result.transactionCount} Transactions created.`,
      });
    } catch (e: any) {
      toast({ title: "Seed Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleWaitlistTrigger = async () => {
    const { data: waitlistBooking, error: wErr } = await supabase
      .from("bookings")
      .select("id, user_id, studio_id, class_id, classes(name, start_time)")
      .eq("status", "waitlist")
      .limit(1)
      .maybeSingle();

    if (wErr || !waitlistBooking) {
      toast({ title: "Demo Failed", description: "No waitlisted students found.", variant: "destructive" });
      return;
    }

    const classId = waitlistBooking.class_id;
    const { data: lastConfirmed, error: cErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("class_id", classId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cErr || !lastConfirmed) {
      toast({ title: "Demo Failed", description: "No confirmed students found to simulate a cancellation.", variant: "destructive" });
      return;
    }

    await supabase.from("bookings").update({ status: "cancelled" as any }).eq("id", lastConfirmed.id);
    onWaitlistPromoted.current?.();
    toast({ title: "Student cancelled. 1 spot opened.", description: "Triggering Waitlist..." });

    setTimeout(() => {
      triggerWaitlistPromotion({
        bookingId: waitlistBooking.id,
        userId: waitlistBooking.user_id,
        studioId: waitlistBooking.studio_id,
        className: (waitlistBooking.classes as any)?.name ?? "Class",
        classTime: (waitlistBooking.classes as any)?.start_time ?? "",
      });
    }, 1500);
  };

  const handleResetWaitlistDemo = async () => {
    const { data: cancelledBookings } = await supabase
      .from("bookings")
      .select("id, user_id, class_id")
      .eq("studio_id", activeStudio?.id ?? "")
      .eq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cancelledBookings) {
      toast({ title: "Nothing to reset", description: "No cancelled bookings found.", variant: "destructive" });
      return;
    }

    const classId = cancelledBookings.class_id;
    await supabase.from("bookings").update({ status: "confirmed" as any }).eq("id", cancelledBookings.id);

    const { data: promotedBooking } = await supabase
      .from("bookings")
      .select("id, user_id")
      .eq("class_id", classId)
      .eq("status", "confirmed")
      .neq("user_id", cancelledBookings.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promotedBooking) {
      await supabase.from("bookings").update({ status: "waitlist" as any }).eq("id", promotedBooking.id);
    }

    clearMessages();
    onWaitlistPromoted.current?.();
    toast({ title: "Demo Reset ✓", description: "Waitlist demo restored. Ready to run again." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-dashed border-amber-400/60 bg-amber-50/50 text-amber-700 hover:bg-amber-100/60 hover:text-amber-800">
          <Zap className="h-3.5 w-3.5" />
          Demo Triggers
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Simulate SMS scenarios</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => triggerScenario("reminder", studioName)} className="gap-2 cursor-pointer">
          <Bell className="h-4 w-4 text-blue-500" /> Trigger: 2-Hour Reminder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWaitlistTrigger} className="gap-2 cursor-pointer">
          <Users className="h-4 w-4 text-green-500" /> Simulate Waitlist Opening
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => triggerScenario("low-balance", studioName)} className="gap-2 cursor-pointer">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Trigger: Low Balance Warning
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Frictionless Commerce {!isPro && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => isPro && triggerScenario("smart-review", studioName)}
          className={`gap-2 cursor-pointer ${!isPro ? "opacity-50 pointer-events-none" : ""}`}
          disabled={!isPro}
        >
          <MessageSquare className="h-4 w-4 text-teal-500" /> Trigger: Smart Review
          {!isPro && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => isPro && triggerScenario("refill", studioName)}
          className={`gap-2 cursor-pointer ${!isPro ? "opacity-50 pointer-events-none" : ""}`}
          disabled={!isPro}
        >
          <CreditCard className="h-4 w-4 text-emerald-500" /> Trigger: Low Balance Refill
          {!isPro && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => isPro && triggerScenario("flash-deal", studioName)}
          className={`gap-2 cursor-pointer ${!isPro ? "opacity-50 pointer-events-none" : ""}`}
          disabled={!isPro}
        >
          <Flame className="h-4 w-4 text-red-500" /> Trigger: 1-Hour Flash Deal
          {!isPro && <Lock className="ml-auto h-3 w-3 text-muted-foreground" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleResetWaitlistDemo} className="gap-2 cursor-pointer text-muted-foreground">
          <RotateCcw className="h-4 w-4" /> Reset Waitlist Demo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSeedDemoData} className="gap-2 cursor-pointer text-muted-foreground">
          <Database className="h-4 w-4" /> Reset & Seed Demo Studio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
