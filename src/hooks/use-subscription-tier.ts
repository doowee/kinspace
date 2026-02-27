import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";

export type SubscriptionTier = "standard" | "pro";

/**
 * Reads the subscription_tier from the *currently active studio*.
 * Provides a `changeTier` helper that updates the studio's tier in the DB.
 */
export function useSubscriptionTier() {
  const { activeStudio } = useStudio();
  const [tier, setTier] = useState<SubscriptionTier>("standard");
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    if (!activeStudio?.id) { setLoading(false); return; }

    const { data } = await supabase
      .from("studios")
      .select("subscription_tier")
      .eq("id", activeStudio.id)
      .maybeSingle();

    setTier((data?.subscription_tier as SubscriptionTier) ?? "standard");
    setLoading(false);
  }, [activeStudio?.id]);

  useEffect(() => { fetchTier(); }, [fetchTier]);

  // Also react to activeStudio changes from context if it carries the tier
  useEffect(() => {
    if ((activeStudio as any)?.subscription_tier) {
      setTier((activeStudio as any).subscription_tier as SubscriptionTier);
    }
  }, [activeStudio]);

  const changeTier = useCallback(async (newTier: SubscriptionTier) => {
    if (!activeStudio?.id) return;
    const { error } = await supabase
      .from("studios")
      .update({ subscription_tier: newTier } as any)
      .eq("id", activeStudio.id);
    if (!error) {
      setTier(newTier);
    }
    return error;
  }, [activeStudio?.id]);

  return { tier, isPro: tier === "pro", loading, changeTier };
}
