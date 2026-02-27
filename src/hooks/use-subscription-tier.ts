import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = "standard" | "pro";

export function useSubscriptionTier() {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>("standard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      // Get org via profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("subscription_tier")
          .eq("id", profile.organization_id)
          .single();

        setTier((org?.subscription_tier as SubscriptionTier) ?? "standard");
      } else {
        // Try via studio membership → studio → org
        const { data: memberships } = await supabase
          .from("studio_members")
          .select("studios(organization_id)")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .limit(1);

        const orgId = (memberships?.[0] as any)?.studios?.organization_id;
        if (orgId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("subscription_tier")
            .eq("id", orgId)
            .single();

          setTier((org?.subscription_tier as SubscriptionTier) ?? "standard");
        }
      }

      setLoading(false);
    };

    fetch();
  }, [user?.id]);

  return { tier, isPro: tier === "pro", loading };
}
