import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_PRICES: Record<string, number> = {
  standard: 9900,  // $99 in cents
  pro: 16900,      // $169 in cents
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");

    // Use anon key + user's auth header for token validation (ES256 compatible)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Use service role client for privileged DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    // ── ACTION: add-location ──
    // Adds a new studio as a subscription item to the org's master subscription
    if (action === "add-location") {
      const { org_id, studio_id, tier } = body;
      if (!org_id || !studio_id || !tier) throw new Error("Missing org_id, studio_id, or tier");

      const priceAmount = TIER_PRICES[tier];
      if (!priceAmount) throw new Error("Invalid tier");

      // Get org
      const { data: org } = await supabase
        .from("organizations")
        .select("stripe_customer_id, stripe_subscription_id")
        .eq("id", org_id)
        .single();

      if (!org) throw new Error("Organization not found");

      let customerId = org.stripe_customer_id;
      let subscriptionId = org.stripe_subscription_id;

      // Create Stripe customer if needed
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { org_id, user_id: user.id },
        });
        customerId = customer.id;
        await supabase
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", org_id);
      }

      // Create or find the price for this tier
      // Use a product per tier to keep things clean
      const productName = tier === "pro" ? "Kinspace Pro Engine" : "Kinspace Standard";
      const products = await stripe.products.search({
        query: `name:'${productName}' active:'true'`,
      });

      let priceId: string;
      if (products.data.length > 0) {
        // Find recurring price on this product
        const prices = await stripe.prices.list({
          product: products.data[0].id,
          active: true,
          recurring: { interval: "month" },
        });
        if (prices.data.length > 0 && prices.data[0].unit_amount === priceAmount) {
          priceId = prices.data[0].id;
        } else {
          const newPrice = await stripe.prices.create({
            product: products.data[0].id,
            unit_amount: priceAmount,
            currency: "usd",
            recurring: { interval: "month" },
          });
          priceId = newPrice.id;
        }
      } else {
        const product = await stripe.products.create({ name: productName });
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: priceAmount,
          currency: "usd",
          recurring: { interval: "month" },
        });
        priceId = newPrice.id;
      }

      if (!subscriptionId) {
        // First location — create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId, metadata: { studio_id } }],
          proration_behavior: "create_prorations",
          metadata: { org_id },
        });
        subscriptionId = subscription.id;

        await supabase
          .from("organizations")
          .update({ stripe_subscription_id: subscriptionId })
          .eq("id", org_id);

        // Save subscription_item_id on studio
        const itemId = subscription.items.data[0]?.id;
        if (itemId) {
          await supabase
            .from("studios")
            .update({ stripe_subscription_item_id: itemId } as any)
            .eq("id", studio_id);
        }
      } else {
        // Add line item to existing subscription with proration
        const item = await stripe.subscriptionItems.create({
          subscription: subscriptionId,
          price: priceId,
          proration_behavior: "create_prorations",
          metadata: { studio_id },
        });

        await supabase
          .from("studios")
          .update({ stripe_subscription_item_id: item.id } as any)
          .eq("id", studio_id);
      }

      // Update studio tier
      await supabase
        .from("studios")
        .update({ subscription_tier: tier })
        .eq("id", studio_id);

      return new Response(
        JSON.stringify({ success: true, subscription_id: subscriptionId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: change-tier ──
    // Updates an existing subscription item's price
    if (action === "change-tier") {
      const { studio_id, new_tier } = body;
      if (!studio_id || !new_tier) throw new Error("Missing studio_id or new_tier");

      const priceAmount = TIER_PRICES[new_tier];
      if (!priceAmount) throw new Error("Invalid tier");

      // Get studio's subscription item
      const { data: studio } = await supabase
        .from("studios")
        .select("stripe_subscription_item_id, organization_id")
        .eq("id", studio_id)
        .single();

      if (!studio?.stripe_subscription_item_id) {
        // No Stripe item yet — just update the tier in DB
        await supabase
          .from("studios")
          .update({ subscription_tier: new_tier })
          .eq("id", studio_id);

        return new Response(
          JSON.stringify({ success: true, message: "Tier updated (no Stripe item)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find/create price for the new tier
      const productName = new_tier === "pro" ? "Kinspace Pro Engine" : "Kinspace Standard";
      const products = await stripe.products.search({
        query: `name:'${productName}' active:'true'`,
      });

      let priceId: string;
      if (products.data.length > 0) {
        const prices = await stripe.prices.list({
          product: products.data[0].id,
          active: true,
          recurring: { interval: "month" },
        });
        if (prices.data.length > 0 && prices.data[0].unit_amount === priceAmount) {
          priceId = prices.data[0].id;
        } else {
          const newPrice = await stripe.prices.create({
            product: products.data[0].id,
            unit_amount: priceAmount,
            currency: "usd",
            recurring: { interval: "month" },
          });
          priceId = newPrice.id;
        }
      } else {
        const product = await stripe.products.create({ name: productName });
        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: priceAmount,
          currency: "usd",
          recurring: { interval: "month" },
        });
        priceId = newPrice.id;
      }

      // Update the subscription item with proration
      await stripe.subscriptionItems.update(studio.stripe_subscription_item_id, {
        price: priceId,
        proration_behavior: "create_prorations",
      });

      await supabase
        .from("studios")
        .update({ subscription_tier: new_tier })
        .eq("id", studio_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: get-portal-url ──
    // Returns a Stripe Customer Portal URL for viewing invoices
    if (action === "get-portal-url") {
      const { org_id } = body;
      const { data: org } = await supabase
        .from("organizations")
        .select("stripe_customer_id, name")
        .eq("id", org_id)
        .single();

      if (!org) throw new Error("Organization not found");

      let customerId = org.stripe_customer_id;

      // Auto-create Stripe customer if missing
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: org.name || undefined,
          metadata: { org_id, user_id: user.id },
        });
        customerId = customer.id;
        await supabase
          .from("organizations")
          .update({ stripe_customer_id: customerId })
          .eq("id", org_id);
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: req.headers.get("origin") || "https://kinspace.lovable.app/billing",
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
