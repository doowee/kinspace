import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import InstructorLanding from "./InstructorLanding";

// Safe import for studio theme context
let useStudioThemeSafe: () => { studio: any; loading: boolean; notFound: boolean } | null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/components/StudioThemeProvider");
  useStudioThemeSafe = mod.useStudioTheme;
} catch {
  useStudioThemeSafe = null;
}

type GateStatus = "loading" | "unauthenticated" | "instructor" | "owner" | "student";

export default function InstructorAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<GateStatus>("loading");

  // Safely try to get studio context
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
        setStatus("unauthenticated");
        return;
      }

      if (!memberships || memberships.length === 0) {
        setStatus("student");
        return;
      }

      const roles = new Set(memberships.map((m) => m.role));

      if (roles.has("owner") || roles.has("admin")) {
        setStatus("owner");
        return;
      }

      if (roles.has("instructor") || roles.has("front_desk")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();

        const name = profile?.first_name || "there";
        toast({ title: `Welcome back, ${name}.` });
        setStatus("instructor");
        return;
      }

      setStatus("student");
    };

    checkRole();
  }, [user, authLoading]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <InstructorLanding studio={studioInfo} />;
  }

  if (status === "owner") {
    return <Navigate to="/admin" replace />;
  }

  if (status === "student") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
