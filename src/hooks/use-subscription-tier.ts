import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = "standard" | "pro";

export function useSubscriptionTier() {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("standard");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Try profile → org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.organization_id) {
      setOrgId(profile.organization_id);
      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_tier")
        .eq("id", profile.organization_id)
        .maybeSingle();

      setTier((org?.subscription_tier as SubscriptionTier) ?? "standard");
      setLoading(false);
      return;
    }

    // Fallback: studio membership → studio → org
    const { data: memberships } = await supabase
      .from("studio_members")
      .select("studios(organization_id)")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .limit(1);

    const foundOrgId = (memberships?.[0] as any)?.studios?.organization_id;
    if (foundOrgId) {
      setOrgId(foundOrgId);
      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_tier")
        .eq("id", foundOrgId)
        .maybeSingle();

      setTier((org?.subscription_tier as SubscriptionTier) ?? "standard");
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchTier(); }, [fetchTier]);

  const changeTier = useCallback(async (newTier: SubscriptionTier) => {
    if (!orgId) return;
    const { error } = await supabase
      .from("organizations")
      .update({ subscription_tier: newTier } as any)
      .eq("id", orgId);
    if (!error) {
      setTier(newTier);
    }
    return error;
  }, [orgId]);

  return { tier, isPro: tier === "pro", loading, changeTier, orgId };
}
