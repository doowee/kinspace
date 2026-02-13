import { useDemoPhone } from "@/contexts/DemoPhoneContext";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Zap, Bell, Users, AlertTriangle, Star } from "lucide-react";
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
  const { triggerScenario, triggerWaitlistPromotion, onWaitlistPromoted } = useDemoPhone();

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
