import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Save } from "lucide-react";

export default function PoliciesTab() {
  const { activeStudio } = useStudio();
  const [windowHours, setWindowHours] = useState(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeStudio) return;
    const load = async () => {
      const { data } = await supabase
        .from("studios")
        .select("late_cancel_window_hours")
        .eq("id", activeStudio.id)
        .single();
      if (data) {
        setWindowHours((data as any).late_cancel_window_hours ?? 12);
      }
    };
    load();
  }, [activeStudio]);

  const handleSave = async () => {
    if (!activeStudio) return;
    const clamped = Math.max(0, Math.min(168, Math.round(windowHours)));
    setSaving(true);
    const { error } = await supabase
      .from("studios")
      .update({ late_cancel_window_hours: clamped } as any)
      .eq("id", activeStudio.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save policy");
    } else {
      setWindowHours(clamped);
      toast.success("Cancellation policy updated!");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Cancellation Policy
          </CardTitle>
          <CardDescription>
            Control how late cancellations are handled for your studio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="cancel-window">Late Cancellation Window (Hours)</Label>
            <Input
              id="cancel-window"
              type="number"
              min={0}
              max={168}
              value={windowHours}
              onChange={(e) => setWindowHours(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Students who cancel within this window will forfeit their credit.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
