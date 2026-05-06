import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Users, Send, AlertCircle } from "lucide-react";

interface Props {
  totalLapsed: number;
  refreshKey?: number;
}

export default function LapsedSummary({ totalLapsed, refreshKey = 0 }: Props) {
  const { activeStudio } = useStudio();
  const [reached, setReached] = useState(0);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    if (!activeStudio?.id) return;
    (async () => {
      const { data } = await supabase
        .from("sms_campaigns")
        .select("sent_count, failed_count, skipped_count")
        .eq("studio_id", activeStudio.id)
        .eq("mode", "winback")
        .order("created_at", { ascending: false })
        .limit(5);
      const rows = (data ?? []) as Array<{ sent_count: number; failed_count: number; skipped_count: number }>;
      setReached(rows.reduce((a, r) => a + (r.sent_count ?? 0), 0));
      setFailed(rows.reduce((a, r) => a + (r.failed_count ?? 0) + (r.skipped_count ?? 0), 0));
    })();
  }, [activeStudio?.id, refreshKey]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <span className="flex items-center gap-1.5 text-foreground">
        <Users className="h-3 w-3" />
        <span className="font-medium tabular-nums">{totalLapsed}</span>
        <span className="text-muted-foreground">lapsed</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1.5 text-emerald-700">
        <Send className="h-3 w-3" />
        <span className="font-medium tabular-nums">{reached}</span>
        <span className="opacity-80">reached</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="flex items-center gap-1.5 text-rose-700">
        <AlertCircle className="h-3 w-3" />
        <span className="font-medium tabular-nums">{failed}</span>
        <span className="opacity-80">failed / opted out</span>
      </span>
      <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">
        last 5 win-back campaigns
      </span>
    </div>
  );
}
