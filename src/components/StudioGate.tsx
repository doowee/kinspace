import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * "Traffic cop" — checks if the logged-in user belongs to any studio.
 * - 0 studios → redirect to /onboarding
 * - 1+ studios → render children (the app shell)
 */
export default function StudioGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "has-studio" | "no-studio">("loading");

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const { count, error } = await supabase
        .from("studio_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Studio check failed:", error);
        setStatus("no-studio");
        return;
      }

      setStatus((count ?? 0) > 0 ? "has-studio" : "no-studio");
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

  return <>{children}</>;
}
