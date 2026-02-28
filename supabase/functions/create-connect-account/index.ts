import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, studio_id } = body;

    // ── Shared authorization helper ──
    const verifyOwnership = async (studioId: string) => {
      const { data: role } = await supabase.rpc("get_studio_role", {
        _user_id: user.id,
        _studio_id: studioId,
      });
      if (role !== "owner") {
        throw new Error("Only studio owners can manage Stripe Connect");
      }
    };

    // ── ACTION: create-onboarding ──
    // Creates Express account + onboarding link
    if (action === "create-onboarding") {
      if (!studio_id) throw new Error("Missing studio_id");
      await verifyOwnership(studio_id);

      // Check if studio already has a connect account
      const { data: studio } = await supabase
        .from("studios")
        .select("stripe_account_id, name")
        .eq("id", studio_id)
        .single();

      let accountId = studio?.stripe_account_id;

      if (!accountId) {
        // Create a new Express connected account
        const account = await stripe.accounts.create({
          type: "express",
          metadata: { studio_id, user_id: user.id },
          business_profile: {
            name: studio?.name || undefined,
          },
        });
        accountId = account.id;

        // Save account ID to studio
        await supabase
          .from("studios")
          .update({ stripe_account_id: accountId })
          .eq("id", studio_id);
      }

      const origin = req.headers.get("origin") || "https://kinspace.lovable.app";

      // Create account onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/admin/billing?connect_refresh=true&studio_id=${studio_id}`,
        return_url: `${origin}/admin/billing?connect_success=true&studio_id=${studio_id}`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({ url: accountLink.url, account_id: accountId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: check-status ──
    // Checks if a connected account has completed onboarding
    if (action === "check-status") {
      if (!studio_id) throw new Error("Missing studio_id");
      await verifyOwnership(studio_id);

      const { data: studio } = await supabase
        .from("studios")
        .select("stripe_account_id")
        .eq("id", studio_id)
        .single();

      if (!studio?.stripe_account_id) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const account = await stripe.accounts.retrieve(studio.stripe_account_id);

      return new Response(
        JSON.stringify({
          connected: account.charges_enabled && account.payouts_enabled,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          account_id: studio.stripe_account_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    console.error("create-connect-account error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
