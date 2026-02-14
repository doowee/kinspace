import { useDemoPhone } from "@/contexts/DemoPhoneContext";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Zap, Bell, Users, AlertTriangle, Star, RotateCcw, Database, MessageSquare, CreditCard, Flame } from "lucide-react";
import { seedDemoData } from "@/lib/seed-demo-data";
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

  const studioName = activeStudio?.name || "Your Studio";

  // Only visible to owners
  if (activeRole !== "owner") return null;

  const handleWaitlistTrigger = async () => {
    // Step 1: Find a waitlisted booking first
    const { data: waitlistBooking, error: wErr } = await supabase
      .from("bookings")
      .select("id, user_id, studio_id, class_id, classes(name, start_time)")
      .eq("status", "waitlist")
      .limit(1)
      .maybeSingle();

    if (wErr || !waitlistBooking) {
      toast({
        title: "Demo Failed",
        description: "No waitlisted students found. Please waitlist a student first.",
        variant: "destructive",
      });
      return;
    }

    const classId = waitlistBooking.class_id;

    // Step 2: Find the LAST confirmed booking for this class to cancel
    const { data: lastConfirmed, error: cErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("class_id", classId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cErr || !lastConfirmed) {
      toast({
        title: "Demo Failed",
        description: "No confirmed students found to simulate a cancellation.",
        variant: "destructive",
      });
      return;
    }

    // Step 3: Cancel that booking to free a spot
    await supabase
      .from("bookings")
      .update({ status: "cancelled" as any })
      .eq("id", lastConfirmed.id);

    // Refresh roster UI
    onWaitlistPromoted.current?.();

    toast({
      title: "Student cancelled. 1 spot opened.",
      description: "Triggering Waitlist...",
    });

    // Step 4: After 1.5s delay, trigger the SMS
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
    // Find the class that has a waitlist or recently promoted booking
    // Look for classes with both cancelled and confirmed bookings from same user
    const { data: waitlistBookings } = await supabase
      .from("bookings")
      .select("id, user_id, class_id, status")
      .eq("studio_id", activeStudio?.id ?? "")
      .in("status", ["confirmed", "waitlist"])
      .order("created_at", { ascending: false });

    // Find the class that had the demo run on it - look for the last cancelled booking
    const { data: cancelledBookings } = await supabase
      .from("bookings")
      .select("id, user_id, class_id")
      .eq("studio_id", activeStudio?.id ?? "")
      .eq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cancelledBookings) {
      toast({
        title: "Nothing to reset",
        description: "No cancelled bookings found from a previous demo run.",
        variant: "destructive",
      });
      return;
    }

    const classId = cancelledBookings.class_id;

    // Re-confirm the cancelled booking
    await supabase
      .from("bookings")
      .update({ status: "confirmed" as any })
      .eq("id", cancelledBookings.id);

    // Find the promoted student's booking (confirmed, same class, different user)
    // and reset it back to waitlist
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
      await supabase
        .from("bookings")
        .update({ status: "waitlist" as any })
        .eq("id", promotedBooking.id);

      // Restore the credit that was deducted
      const { data: pass } = await supabase
        .from("student_passes")
        .select("id, credits_remaining")
        .eq("user_id", promotedBooking.user_id)
        .eq("studio_id", activeStudio?.id ?? "")
        .order("expires_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (pass) {
        await supabase
          .from("student_passes")
          .update({ credits_remaining: pass.credits_remaining + 1 })
          .eq("id", pass.id);
      }
    }

    // Clear demo phone messages
    clearMessages();

    // Refresh roster
    onWaitlistPromoted.current?.();

    toast({
      title: "Demo Reset ✓",
      description: "Waitlist demo restored to initial state. Ready to run again.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-dashed border-amber-400/60 bg-amber-50/50 text-amber-700 hover:bg-amber-100/60 hover:text-amber-800"
        >
          <Zap className="h-3.5 w-3.5" />
          Demo Triggers
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Simulate SMS scenarios
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => triggerScenario("reminder", studioName)}
          className="gap-2 cursor-pointer"
        >
          <Bell className="h-4 w-4 text-blue-500" />
          Trigger: 2-Hour Reminder
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleWaitlistTrigger}
          className="gap-2 cursor-pointer"
        >
          <Users className="h-4 w-4 text-green-500" />
          Simulate Waitlist Opening
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => triggerScenario("low-balance", studioName)}
          className="gap-2 cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Trigger: Low Balance Warning
        </DropdownMenuItem>
         <DropdownMenuItem
          onClick={() => triggerScenario("review", studioName)}
          className="gap-2 cursor-pointer"
        >
          <Star className="h-4 w-4 text-purple-500" />
          Trigger: Review Request
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Frictionless Commerce
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => triggerScenario("smart-review", studioName)}
          className="gap-2 cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 text-teal-500" />
          Trigger: Smart Review
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => triggerScenario("refill", studioName)}
          className="gap-2 cursor-pointer"
        >
          <CreditCard className="h-4 w-4 text-emerald-500" />
          Trigger: Low Balance Refill
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => triggerScenario("flash-deal", studioName)}
          className="gap-2 cursor-pointer"
        >
          <Flame className="h-4 w-4 text-red-500" />
          Trigger: 1-Hour Flash Deal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleResetWaitlistDemo}
          className="gap-2 cursor-pointer text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Waitlist Demo
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              toast({ title: "Seeding...", description: "Creating demo data, please wait." });
              const result = await seedDemoData();
              toast({
                title: "Studio Seeded ✓",
                description: `${result.classCount} Classes, ${result.studentCount} Students, ${result.bookingCount} Bookings created. Waitlist ready on "${result.waitlistClassName}".`,
              });
            } catch (e: any) {
              toast({ title: "Seed Failed", description: e.message, variant: "destructive" });
            }
          }}
          className="gap-2 cursor-pointer text-muted-foreground"
        >
          <Database className="h-4 w-4" />
          ⚡ Seed Realistic Demo Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
