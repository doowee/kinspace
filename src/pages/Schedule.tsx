import { useState, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Users } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ClassRow {
  id: string;
  name: string;
  start_time: string;
  capacity: number;
  instructor_id: string | null;
  studio_id: string;
}

export default function Schedule() {
  const { activeStudio, activeRole } = useStudio();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [className, setClassName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [submitting, setSubmitting] = useState(false);

  const canManage = activeRole === "owner" || activeRole === "instructor";

  const fetchClasses = async () => {
    if (!activeStudio) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("studio_id", activeStudio.id)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to fetch classes:", error);
    } else {
      setClasses(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, [activeStudio?.id]);

  const classesOnDate = classes.filter((c) =>
    isSameDay(new Date(c.start_time), selectedDate)
  );

  const datesWithClasses = classes.map((c) => new Date(c.start_time));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudio || !className || !startTime) return;

    setSubmitting(true);

    // Combine selected date with time input
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const fullDateTime = `${dateStr}T${startTime}:00`;

    const { error } = await supabase.from("classes").insert({
      name: className,
      start_time: fullDateTime,
      capacity: parseInt(capacity) || 10,
      studio_id: activeStudio.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Class created" });
      setClassName("");
      setStartTime("");
      setCapacity("10");
      setDialogOpen(false);
      fetchClasses();
    }
    setSubmitting(false);
  };

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Schedule</h2>
          <p className="mt-1 text-muted-foreground">
            Classes for {activeStudio.name}
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="class-name">Class Name</Label>
                  <Input
                    id="class-name"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Morning Flow"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="class-time">Time</Label>
                  <Input
                    id="class-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="class-date">Date</Label>
                  <Input
                    id="class-date"
                    value={format(selectedDate, "PPP")}
                    disabled
                    className="text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a different date on the calendar to change
                  </p>
                </div>
                <div>
                  <Label htmlFor="class-capacity">Capacity</Label>
                  <Input
                    id="class-capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating…" : "Create Class"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className={cn("pointer-events-auto")}
              modifiers={{ hasClass: datesWithClasses }}
              modifiersClassNames={{
                hasClass: "bg-primary/20 font-bold text-primary",
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : classesOnDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes scheduled for this day.</p>
          ) : (
            classesOnDate.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="font-semibold">{cls.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(cls.start_time), "h:mm a")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cls.capacity} spots
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(cls.start_time), "h:mm a")}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
