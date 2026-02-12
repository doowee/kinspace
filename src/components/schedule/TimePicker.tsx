import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

  const setHour12 = (h12: number) => {
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    onChange({ ...value, hour: h24 });
  };

  const setMinute = (m: number) => {
    onChange({ ...value, minute: m });
  };

  const togglePeriod = (pm: boolean) => {
    let h = value.hour;
    if (pm && h < 12) h += 12;
    if (!pm && h >= 12) h -= 12;
    onChange({ ...value, hour: h });
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2 rounded-md border bg-background p-2">
        {/* Hour */}
        <ScrollColumn
          items={HOURS}
          selected={display12}
          onSelect={setHour12}
          formatItem={(h) => String(h).padStart(2, "0")}
        />
        <span className="text-lg font-semibold text-muted-foreground">:</span>
        {/* Minute */}
        <ScrollColumn
          items={MINUTES}
          selected={value.minute}
          onSelect={setMinute}
          formatItem={(m) => String(m).padStart(2, "0")}
        />
        {/* AM/PM */}
        <div className="flex flex-col gap-1 ml-1">
          <Button
            type="button"
            size="sm"
            variant={!isPM ? "default" : "ghost"}
            className="h-8 px-3 text-xs"
            onClick={() => togglePeriod(false)}
          >
            AM
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isPM ? "default" : "ghost"}
            className="h-8 px-3 text-xs"
            onClick={() => togglePeriod(true)}
          >
            PM
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {String(display12).padStart(2, "0")}:{String(value.minute).padStart(2, "0")} {isPM ? "PM" : "AM"}
      </p>
    </div>
  );
}

function ScrollColumn<T extends number>({
  items,
  selected,
  onSelect,
  formatItem,
}: {
  items: T[];
  selected: T;
  onSelect: (item: T) => void;
  formatItem: (item: T) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && containerRef.current) {
      const child = containerRef.current.children[idx] as HTMLElement;
      child?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-28 w-12 flex-col items-center gap-0.5 overflow-y-auto rounded-md scrollbar-thin"
    >
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={cn(
            "flex h-9 w-full shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors",
            selected === item
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {formatItem(item)}
        </button>
      ))}
    </div>
  );
}
