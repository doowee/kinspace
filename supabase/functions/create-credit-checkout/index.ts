import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PACKS: Record<string, { name: string; credits: number; price: number }> = {
  drop_in: { name: "Drop-In (1 Credit)", credits: 1, price: 2500 },
  "5_pack": { name: "5-Class Pack", credits: 5, price: 10000 },
  "10_pack": { name: "10-Class Pack", credits: 10, price: 17500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: validate user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Parse body
    const { pack } = await req.json();
    const packInfo = PACKS[pack];
    if (!packInfo) {
      return new Response(JSON.stringify({ error: "Invalid pack" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Init Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or reference existing Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "https://kinspace.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: packInfo.price,
            product_data: { name: packInfo.name },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        setup_future_usage: "off_session",
      },
      metadata: {
        user_id: userId,
        credits: String(packInfo.credits),
        pack,
      },
      success_url: `${origin}/credits?payment=success`,
      cancel_url: `${origin}/credits?payment=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("create-credit-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
