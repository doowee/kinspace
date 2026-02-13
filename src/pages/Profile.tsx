import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, LogOut } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Student";

  return (
    <div className="animate-fade-in max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">{fullName}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
