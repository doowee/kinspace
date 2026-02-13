import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, Shield, Search, PlusCircle } from "lucide-react";
import StudentPortal from "@/components/dashboard/StudentPortal";

type DashboardView = "loading" | "owner" | "student" | "new-user";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<DashboardView>("loading");

  useEffect(() => {
    if (!user) return;

    const determine = async () => {
      const [ownedRes, bookingsRes] = await Promise.all([
        supabase
          .from("studio_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("role", ["owner", "instructor"]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const ownedCount = ownedRes.count ?? 0;
      const bookingsCount = bookingsRes.count ?? 0;

      if (ownedCount > 0) {
        setView("owner");
      } else if (bookingsCount > 0) {
        setView("student");
      } else {
        const { count: memberCount } = await supabase
          .from("studio_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if ((memberCount ?? 0) > 0) {
          setView("student");
        } else {
          setView("new-user");
        }
      }
    };

    determine();
  }, [user?.id]);

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (view === "new-user") {
    return <NewUserWelcome />;
  }

  if (view === "student") {
    return <StudentPortal />;
  }

  // Owner - redirect to index route which is inside StudioProvider
  return <OwnerRedirect />;
}

function OwnerRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);
  return null;
}

function NewUserWelcome() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="animate-fade-in max-w-lg w-full space-y-8 text-center">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Welcome to KinSpace
          </h1>
          <p className="mt-3 text-muted-foreground text-lg">
            What brings you here today?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
            onClick={() => navigate("/")}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
              <Search className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold text-lg">Book a Class</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Find and book classes at a studio near you.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
            onClick={() => navigate("/onboarding")}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
              <PlusCircle className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold text-lg">I Own a Studio</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up and manage your studio on KinSpace.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
