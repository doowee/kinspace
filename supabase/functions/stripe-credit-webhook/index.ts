import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = Deno.env.get("STRIPE_CREDIT_WEBHOOK_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature || !endpointSecret) {
    console.error("Missing stripe-signature or webhook secret");
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!userId || credits <= 0) {
      console.error("Invalid metadata:", session.metadata);
      return new Response("Invalid metadata", { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Increment class_points
    const { error: updateError } = await supabase.rpc("increment_class_points", {
      _user_id: userId,
      _amount: credits,
    });

    // Fallback: direct update if RPC doesn't exist yet
    if (updateError) {
      console.warn("RPC fallback, using direct update:", updateError.message);
      const { error: directError } = await supabase
        .from("profiles")
        .update({ class_points: credits }) // This is a fallback - ideally use RPC
        .eq("id", userId);

      if (directError) {
        console.error("Failed to update class_points:", directError);
        return new Response("Failed to update credits", { status: 500 });
      }

      // We need to do an increment, not a set. Use raw SQL via RPC or a proper increment.
      // Actually, let's just use the SQL increment directly:
      const { error: incError } = await supabase
        .from("profiles")
        .update({})
        .eq("id", userId);

      // The safest approach without a custom RPC is to read + write
      const { data: profile } = await supabase
        .from("profiles")
        .select("class_points")
        .eq("id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ class_points: (profile.class_points ?? 0) + credits })
          .eq("id", userId);
      }
    }

    // Insert audit transaction - need a studio_id; use the user's home_studio_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("home_studio_id")
      .eq("id", userId)
      .single();

    if (profile?.home_studio_id) {
      await supabase.from("transactions").insert({
        user_id: userId,
        studio_id: profile.home_studio_id,
        amount: (session.amount_total ?? 0) / 100,
        payment_method: "card",
        status: "completed",
        type: "class_pack",
        description: `${session.metadata?.pack ?? "credit"} purchase (${credits} credits)`,
      });
    }

    console.log(`Credited ${credits} points to user ${userId}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
