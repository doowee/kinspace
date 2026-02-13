import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserStudios } from "@/lib/supabase-helpers";

interface Studio {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  organization_id: string | null;
  created_at: string;
}

interface StudioMembership {
  studio_id: string;
  role: string;
  studios: Studio;
}

interface StudioContextType {
  memberships: StudioMembership[];
  activeStudio: Studio | null;
  setActiveStudioId: (id: string) => void;
  activeRole: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<StudioMembership[]>([]);
  const [activeStudioId, setActiveStudioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudios = async () => {
    try {
      const data = await getUserStudios();
      const typed = (data as unknown) as StudioMembership[];
      setMemberships(typed);
      
      if (typed.length > 0 && !activeStudioId) {
        const saved = localStorage.getItem("coreflow_active_studio");
        const found = typed.find(m => m.studio_id === saved);
        setActiveStudioId(found ? saved : typed[0].studio_id);
      }
    } catch (err) {
      console.error("Failed to fetch studios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  useEffect(() => {
    if (activeStudioId) {
      localStorage.setItem("coreflow_active_studio", activeStudioId);
    }
  }, [activeStudioId]);

  const activeMembership = memberships.find(m => m.studio_id === activeStudioId);
  const activeStudio = activeMembership?.studios ?? null;
  const activeRole = activeMembership?.role ?? null;

  return (
    <StudioContext.Provider
      value={{
        memberships,
        activeStudio,
        setActiveStudioId,
        activeRole,
        loading,
        refetch: fetchStudios,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
