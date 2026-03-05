import { useEffect, useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import StudentLanding from "./StudentLanding";
import { Skeleton } from "@/components/ui/skeleton";

// Safe import — useStudioTheme may not be available outside StudioThemeProvider
let useStudioThemeSafe: () => { studio: any; loading: boolean; notFound: boolean } | null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/components/StudioThemeProvider");
  useStudioThemeSafe = mod.useStudioTheme;
} catch {
  useStudioThemeSafe = null;
}

type GateStatus = "loading" | "unauthenticated" | "student" | "instructor" | "owner";

export default function StudentAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<GateStatus>("loading");

  // Safely try to get studio context (only available inside StudioThemeProvider)
  let studioInfo: { id: string; name: string; logo_url: string | null } | null = null;
  try {
    if (useStudioThemeSafe) {
      const ctx = useStudioThemeSafe();
      if (ctx?.studio) {
        studioInfo = { id: ctx.studio.id, name: ctx.studio.name, logo_url: ctx.studio.logo_url };
      }
    }
  } catch {
    // Not inside a StudioThemeProvider — that's fine
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    const checkRole = async () => {
      const { data: memberships, error } = await supabase
        .from("studio_members")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Role check failed:", error);
        setStatus("student"); // fallback to student view
        return;
      }

      const roles = new Set((memberships ?? []).map((m) => m.role));

      if (roles.has("owner") || roles.has("admin")) {
        setStatus("owner");
        return;
      }

      if (roles.has("instructor") || roles.has("front_desk")) {
        setStatus("instructor");
        return;
      }

      // Welcome toast for students
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      const name = profile?.first_name || "there";
      toast({ title: `Welcome back, ${name}!` });
      setStatus("student");
    };

    checkRole();
  }, [user, authLoading]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background p-8 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <StudentLanding studio={studioInfo} />;
  }

  if (status === "owner") {
    return <Navigate to="/admin" replace />;
  }

  if (status === "instructor") {
    return <Navigate to="/instructor-portal" replace />;
  }

  return <>{children}</>;
}
