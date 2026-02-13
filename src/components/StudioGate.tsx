import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * "Traffic cop" — checks if the logged-in user is an owner or instructor at any studio.
 * - Has owner/instructor role → render children (the owner app shell)
 * - Only student role or no studios → redirect to /dashboard (student portal)
 * - No memberships at all → redirect to /onboarding
 */
export default function StudioGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "has-studio" | "student-only" | "no-studio">("loading");

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      // Check for owner or instructor role
      const { count: staffCount, error: staffError } = await supabase
        .from("studio_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("role", ["owner", "instructor"]);

      if (staffError) {
        console.error("Studio check failed:", staffError);
        setStatus("no-studio");
        return;
      }

      if ((staffCount ?? 0) > 0) {
        setStatus("has-studio");
        return;
      }

      // Check if they have any membership at all (student)
      const { count: anyCount } = await supabase
        .from("studio_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((anyCount ?? 0) > 0) {
        setStatus("student-only");
      } else {
        setStatus("no-studio");
      }
    };

    check();
  }, [user]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "no-studio") {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === "student-only") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
