import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";

type CampaignMode = "reengage" | "renew" | "winback";

interface CampaignRow {
  id: string;
  mode: CampaignMode;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  sender_id: string;
  sender_name?: string | null;
}

interface Props {
  mode: CampaignMode;
  /** Bumping this triggers a refetch (e.g. after a new send completes). */
  refreshKey?: number;
}

export default function SmsCampaignHistory({ mode, refreshKey = 0 }: Props) {
  const { activeStudio } = useStudio();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeStudio?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("sms_campaigns")
      .select("id, mode, recipient_count, sent_count, failed_count, skipped_count, created_at, sender_id")
      .eq("studio_id", activeStudio.id)
      .eq("mode", mode)
      .order("created_at", { ascending: false })
      .limit(5);

    const base = (data ?? []) as CampaignRow[];
    const senderIds = [...new Set(base.map((r) => r.sender_id))];
    let nameMap: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", senderIds);
      (profs ?? []).forEach((p: any) => {
        nameMap[p.id] =
          [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Owner";
      });
    }
    setRows(base.map((r) => ({ ...r, sender_name: nameMap[r.sender_id] ?? "Owner" })));
    setLoading(false);
  }, [activeStudio?.id, mode]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading && rows.length === 0) return null;
  if (!loading && rows.length === 0) return null;

  const label =
    mode === "reengage"
      ? "Re-engage history"
      : mode === "renew"
        ? "Renewal nudge history"
        : "Lapsed win-back history";

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <History className="h-3 w-3" />
        {label} <span className="text-muted-foreground font-normal">(last 5)</span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground"
          >
            <span className="truncate">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              {" · "}
              <span className="text-foreground/80">{r.sender_name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="text-emerald-700">{r.sent_count} sent</span>
              {r.failed_count > 0 && (
                <span className="text-rose-700"> · {r.failed_count} failed</span>
              )}
              {r.skipped_count > 0 && (
                <span> · {r.skipped_count} skipped</span>
              )}
              <span className="opacity-50"> / {r.recipient_count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
