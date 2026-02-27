import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/schedule/TimePicker";

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cls: {
    id: string;
    name: string;
    start_time: string;
    capacity_total: number;
    instructor_id: string | null;
    description?: string | null;
  } | null;
  instructors: { id: string; name: string }[];
  onSaved: () => void;
}

export default function EditClassDialog({ open, onOpenChange, cls, instructors, onSaved }: EditClassDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classDate, setClassDate] = useState<Date>(new Date());
  const [time, setTime] = useState({ hour: 9, minute: 0 });
  const [capacity, setCapacity] = useState("10");
  const [instructorId, setInstructorId] = useState("none");
  const [classType, setClassType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cls) {
      setName(cls.name);
      setDescription((cls as any).description || "");
      setClassType((cls as any).class_type || "");
      const dt = new Date(cls.start_time);
      setClassDate(dt);
      setTime({ hour: dt.getHours(), minute: dt.getMinutes() });
      setCapacity(String(cls.capacity_total));
      setInstructorId(cls.instructor_id || "none");
    }
  }, [cls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    setSubmitting(true);

    const dt = new Date(classDate);
    dt.setHours(time.hour, time.minute, 0, 0);

    const { error } = await supabase
      .from("classes")
      .update({
        name,
        description: description || null,
        class_type: classType.trim().toLowerCase() || null,
        start_time: dt.toISOString(),
        capacity_total: parseInt(capacity) || 10,
        instructor_id: instructorId === "none" ? null : instructorId,
      } as any)
      .eq("id", cls.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Class updated" });
      onOpenChange(false);
      onSaved();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Edit Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Class Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description…"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <Label>Instructor</Label>
            <Select value={instructorId} onValueChange={setInstructorId}>
              <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {instructors.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5 mb-1.5"><CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                    {format(classDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={classDate}
                    onSelect={(d) => d && setClassDate(d)}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <TimePicker label="Time" value={time} onChange={setTime} />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-capacity">Capacity</Label>
            <Input id="edit-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
