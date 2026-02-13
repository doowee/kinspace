import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: { hour: number; minute: number };
  onChange: (val: { hour: number; minute: number }) => void;
  label?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const isPM = value.hour >= 12;
  const display12 = value.hour % 12 || 12;

  const setHour12 = (h12str: string) => {
    const h12 = parseInt(h12str);
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    onChange({ ...value, hour: h24 });
  };

  const setMinute = (mStr: string) => {
    onChange({ ...value, minute: parseInt(mStr) });
  };

  const togglePeriod = (pm: boolean) => {
    let h = value.hour;
    if (pm && h < 12) h += 12;
    if (!pm && h >= 12) h -= 12;
    onChange({ ...value, hour: h });
  };

  return (
    <div className="space-y-1.5">
      {label && <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{label}</Label>}
      <div className="flex items-center gap-1.5">
        <Select value={String(display12)} onValueChange={setHour12}>
          <SelectTrigger className="w-[70px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {String(h).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground font-semibold">:</span>
        <Select value={String(value.minute)} onValueChange={setMinute}>
          <SelectTrigger className="w-[70px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {String(m).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border overflow-hidden h-9">
          <button
            type="button"
            onClick={() => togglePeriod(false)}
            className={cn(
              "px-2.5 text-xs font-medium transition-colors",
              !isPM ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => togglePeriod(true)}
            className={cn(
              "px-2.5 text-xs font-medium transition-colors border-l",
              isPM ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}
