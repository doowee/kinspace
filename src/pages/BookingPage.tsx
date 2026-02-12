import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface StudioInfo {
  id: string;
  name: string;
  slug: string;
  location: string | null;
}

interface PublicClass {
  id: string;
  name: string;
  start_time: string;
  capacity: number;
}

export default function BookingPage() {
  const { studio_slug } = useParams<{ studio_slug: string }>();
  const [studio, setStudio] = useState<StudioInfo | null>(null);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studio_slug) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: studioData, error: studioErr } = await supabase.rpc(
        "get_public_studio_by_slug",
        { _slug: studio_slug }
      );

      if (studioErr || !studioData || (studioData as any[]).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const s = (studioData as any[])[0] as StudioInfo;
      setStudio(s);

      const { data: classData } = await supabase.rpc(
        "get_public_classes_by_studio_slug",
        { _slug: studio_slug }
      );

      setClasses((classData as PublicClass[]) ?? []);
      setLoading(false);
    };

    fetchData();
  }, [studio_slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound || !studio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-2">
        <img src="/logo.svg" alt="Kinspace" className="h-10 w-10 mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground">Studio not found</h1>
        <p className="text-muted-foreground">
          The studio you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  const classesOnDate = classes.filter((c) =>
    isSameDay(new Date(c.start_time), selectedDate)
  );

  const datesWithClasses = classes.map((c) => new Date(c.start_time));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-3">
          <img src="/logo.svg" alt="Kinspace" className="h-7 w-7" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground leading-tight">
              {studio.name}
            </h1>
            {studio.location && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {studio.location}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6 animate-fade-in">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Class Schedule
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Browse available classes and pick a time that works for you.
          </p>
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
            {classesOnDate.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes scheduled for this day.
              </p>
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
      </main>
    </div>
  );
}
