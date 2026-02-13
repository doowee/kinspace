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

interface PassInfo {
  credits_remaining: number;
  package_name: string;
}

export default function CreditsBadge() {
  const { user } = useAuth();
  const { activeStudio } = useStudio();
  const [passes, setPasses] = useState<PassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeStudio) {
      setPasses([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("student_passes")
        .select("credits_remaining, packages(name)")
        .eq("user_id", user.id)
        .eq("studio_id", activeStudio.id)
        .gt("credits_remaining", 0)
        .gt("expires_at", new Date().toISOString());

      const mapped: PassInfo[] = (data ?? []).map((row: any) => ({
        credits_remaining: row.credits_remaining,
        package_name: row.packages?.name ?? "Unknown",
      }));
      setPasses(mapped);
      setLoading(false);
    };

    fetch();
  }, [user?.id, activeStudio?.id]);

  if (loading) return null;

  const totalCredits = passes.reduce((sum, p) => sum + p.credits_remaining, 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold cursor-default transition-colors",
            totalCredits > 0
              ? "bg-primary/15 text-primary"
              : "bg-destructive/10 text-destructive"
          )}
        >
          <Ticket className="h-3.5 w-3.5" />
          <span>{totalCredits} Credit{totalCredits !== 1 ? "s" : ""}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs space-y-1">
        {passes.length === 0 ? (
          <p>No active passes</p>
        ) : (
          passes.map((p, i) => (
            <p key={i}>
              {p.package_name}: {p.credits_remaining} left
            </p>
          ))
        )}
      </TooltipContent>
    </Tooltip>
  );
}
