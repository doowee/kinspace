import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Studio { slug: string; name: string; logo_url: string | null; }

export default function BookClass() {
  const { user } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("studio_members")
        .select("studios:studio_id(name, slug, logo_url)")
        .eq("user_id", user.id);

      const map = new Map<string, Studio>();
      (data ?? []).forEach((s: any) => {
        const studio = s.studios as any;
        if (studio?.slug && !map.has(studio.slug)) {
          map.set(studio.slug, { slug: studio.slug, name: studio.name, logo_url: studio.logo_url });
        }
      });
      setStudios(Array.from(map.values()));
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (<div className="flex items-center justify-center py-16"><div className="animate-pulse text-muted-foreground">Loading...</div></div>);
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Book a Class</h2>
        <p className="mt-1 text-muted-foreground">Choose a studio to browse available classes.</p>
      </div>
      {studios.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">No studios found.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {studios.map((s) => (
            <Card key={s.slug} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {s.logo_url ? (<img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-lg object-contain" />) : (<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{s.name.charAt(0)}</div>)}
                  <span className="font-medium text-sm truncate">{s.name}</span>
                </div>
                <Button variant="outline" size="sm" asChild className="gap-1 shrink-0"><Link to={`/book/${s.slug}`}><ExternalLink className="h-3.5 w-3.5" />View Schedule</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
