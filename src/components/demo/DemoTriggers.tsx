import { useDemoPhone } from "@/contexts/DemoPhoneContext";
import { useStudio } from "@/contexts/StudioContext";
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
  const { triggerScenario } = useDemoPhone();

  // Only visible to owners
  if (activeRole !== "owner") return null;

  const studioName = activeStudio?.name || "Your Studio";

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
          onClick={() => triggerScenario("waitlist", studioName)}
          className="gap-2 cursor-pointer"
        >
          <Users className="h-4 w-4 text-green-500" />
          Trigger: Waitlist Promotion
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
