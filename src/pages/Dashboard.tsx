import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, PlusCircle, Eye, ArrowLeft, GraduationCap, Sparkles, BarChart3, Lock } from "lucide-react";
import StudentPortal from "@/components/dashboard/StudentPortal";
import InstructorPortal from "@/pages/InstructorPortal";
import AIMarketingHub from "@/components/dashboard/AIMarketingHub";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import ProUpgradeOverlay from "@/components/dashboard/ProUpgradeOverlay";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

const DEMO_STUDENT_USER_ID = "d4e1b69b-bc2c-4e16-9875-0938910a96c5"; // Jen Woohoo
const DEMO_INSTRUCTOR_USER_ID = "5a04866e-05c2-4040-a8ea-86d5ea379f84"; // Elena Voss

type DashboardView = "loading" | "owner" | "student" | "new-user";
type DemoMode = false | "student" | "instructor";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<DashboardView>("loading");
  const [demoMode, setDemoMode] = useState<DemoMode>(false);

  useEffect(() => {
    if (!user) return;

    const determine = async () => {
      // Check if user is a linked instructor
      const { data: instRecords } = await supabase
        .from("instructors")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (instRecords && instRecords.length > 0) {
        // Check if they're also an owner
        const { data: ownerCheck } = await supabase
          .from("studio_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("role", "owner");

        if ((ownerCheck as any)?.length > 0 || (ownerCheck as any)?.count > 0) {
          // Owner who is also instructor — show owner view
          setView("owner");
        } else {
          // Pure instructor — redirect to portal
          navigate("/instructor-portal", { replace: true });
          return;
        }
      }

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
      } else {
        // Student or new user — try to redirect to branded dashboard
        const { data: membership } = await supabase
          .from("studio_members")
          .select("studios:studio_id(slug)")
          .eq("user_id", user.id)
          .eq("role", "student" as any)
          .limit(1);

        const slug = (membership?.[0] as any)?.studios?.slug;
        if (slug) {
          navigate(`/s/${slug}/dashboard`, { replace: true });
          return;
        }

        // Fallback: check bookings for a studio slug
        if (bookingsCount > 0) {
          const { data: bookingStudio } = await supabase
            .from("bookings")
            .select("studios:studio_id(slug)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const bSlug = (bookingStudio?.[0] as any)?.studios?.slug;
          if (bSlug) {
            navigate(`/s/${bSlug}/dashboard`, { replace: true });
            return;
          }
          setView("student");
        } else {
          setView("new-user");
        }
      }
    };

    determine();
  }, [user?.id]);

  // Owner at /dashboard → redirect into AppLayout at /
  useEffect(() => {
    if (view === "owner" && !demoMode && location.pathname === "/dashboard") {
      navigate("/admin", { replace: true });
    }
  }, [view, demoMode, location.pathname, navigate]);

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

  if (view === "student" || (view === "owner" && demoMode)) {
    const exitDemo = () => {
      setDemoMode(false);
      if (location.pathname === "/dashboard") {
        navigate("/admin", { replace: true });
      }
    };

    return (
      <>
        {demoMode && (
          <div className="sticky top-0 z-50 flex items-center justify-between bg-yellow-400 px-4 py-2 text-yellow-900">
            <span className="text-sm font-semibold">
              👁️ Viewing as {demoMode === "student" ? "Student (Jen)" : "Instructor (Elena)"}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-600 bg-yellow-300 text-yellow-900 hover:bg-yellow-200"
              onClick={exitDemo}
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Return to Owner View
            </Button>
          </div>
        )}
        {(!demoMode || demoMode === "student") ? (
          <StudentPortal demoUserId={demoMode === "student" ? DEMO_STUDENT_USER_ID : undefined} />
        ) : (
          <InstructorPortal demoUserId={DEMO_INSTRUCTOR_USER_ID} />
        )}
      </>
    );
  }

  // Owner waiting to redirect from /dashboard
  if (location.pathname === "/dashboard") {
    return null;
  }

  // Owner view inside AppLayout — show dashboard content with demo toggle
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, Owner.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDemoMode("student")}>
            <Eye className="mr-1.5 h-4 w-4" />
            View as Student
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDemoMode("instructor")}>
            <GraduationCap className="mr-1.5 h-4 w-4" />
            View as Instructor
          </Button>
        </div>
      </div>

      <DashboardTabs demoMode={demoMode} />
    </div>
  );
}

function DashboardTabs({ demoMode }: { demoMode: DemoMode }) {
  const [activeTab, setActiveTab] = useState("analytics");
  const { isPro, loading: tierLoading } = useSubscriptionTier();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="analytics" className="gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="marketing" className="gap-1.5 relative">
          <Sparkles className="h-3.5 w-3.5" />
          AI Marketing
          {!tierLoading && !isPro && (
            <Lock className="ml-1 h-3 w-3 text-muted-foreground" />
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="analytics" className="mt-4">
        <AnalyticsDashboard onNavigateToMarketing={() => setActiveTab("marketing")} />
      </TabsContent>
      <TabsContent value="marketing" className="mt-4">
        <ProUpgradeOverlay locked={!isPro}>
          <AIMarketingHub />
        </ProUpgradeOverlay>
      </TabsContent>
    </Tabs>
  );
}


function NewUserWelcome() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="animate-fade-in max-w-lg w-full space-y-8 text-center">
        <div>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Welcome to Kinspace.Studio
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
                  Set up and manage your studio on Kinspace.Studio.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
