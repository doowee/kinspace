import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { Ticket } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function CreditsBadge() {
  const { user } = useAuth();
  const { activeStudio } = useStudio();
  const [classPoints, setClassPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeStudio) {
      setClassPoints(0);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("class_points")
        .eq("id", user.id)
        .single();

      setClassPoints(data?.class_points ?? 0);
      setLoading(false);
    };

    fetch();
  }, [user?.id, activeStudio?.id]);

  if (loading) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-default transition-colors",
            classPoints > 0
              ? "bg-primary/15 text-primary"
              : "bg-destructive/10 text-destructive"
          )}
        >
          <Ticket className="h-3.5 w-3.5" />
          <span>{classPoints}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p>{classPoints} class points available</p>
      </TooltipContent>
    </Tooltip>
  );
}
