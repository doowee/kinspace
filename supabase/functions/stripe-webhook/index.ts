import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err.message);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  const productType = session.metadata?.product_type;
  const pointValue = parseInt(session.metadata?.point_value ?? "0", 10);
  const studioId = session.metadata?.studio_id;

  if (!userId || !productId) {
    console.error("Invalid metadata:", session.metadata);
    return;
  }

  if (productType === "pack") {
    // Increment class points
    if (pointValue > 0) {
      const { error: rpcError } = await supabase.rpc("increment_class_points", {
        _user_id: userId,
        _amount: pointValue,
      });
      if (rpcError) {
        console.error("Failed to increment class_points:", rpcError);
        throw new Error("Failed to update credits");
      }
      console.log(`[stripe-webhook] Credited ${pointValue} points to user ${userId}`);
    }

    // Insert transaction
    const resolvedStudioId = studioId || await getUserHomeStudioId(userId);
    if (resolvedStudioId) {
      await supabase.from("transactions").insert({
        user_id: userId,
        studio_id: resolvedStudioId,
        amount: (session.amount_total ?? 0) / 100,
        payment_method: "card",
        status: "completed",
        type: "class_pack",
        description: `Pack purchase (${pointValue} credits)`,
      });
    }
  } else if (productType === "subscription") {
    // Fetch subscription details from Stripe
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error("No subscription ID on checkout session");
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Upsert user_subscriptions
    const { error: subError } = await supabase.from("user_subscriptions").upsert(
      {
        user_id: userId,
        product_id: productId,
        studio_id: studioId || null,
        status: "active",
        current_period_end: periodEnd,
      },
      { onConflict: "user_id,product_id", ignoreDuplicates: false }
    );

    if (subError) {
      console.error("Failed to insert user_subscription:", subError);
      // Fallback: try insert without upsert
      await supabase.from("user_subscriptions").insert({
        user_id: userId,
        product_id: productId,
        studio_id: studioId || null,
        status: "active",
        current_period_end: periodEnd,
      });
    }

    // Insert transaction
    const resolvedStudioId = studioId || await getUserHomeStudioId(userId);
    if (resolvedStudioId) {
      await supabase.from("transactions").insert({
        user_id: userId,
        studio_id: resolvedStudioId,
        amount: (session.amount_total ?? 0) / 100,
        payment_method: "card",
        status: "completed",
        type: "subscription",
        description: `Subscription activated`,
      });
    }

    console.log(`[stripe-webhook] Subscription activated for user ${userId}`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  const productId = subscription.metadata?.product_id;

  if (!userId || !productId) {
    console.log("[stripe-webhook] subscription.updated missing metadata, skipping");
    return;
  }

  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const status = subscription.status === "active" ? "active" : "cancelled";

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status, current_period_end: periodEnd })
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("Failed to update subscription:", error);
  } else {
    console.log(`[stripe-webhook] Subscription updated for user ${userId}: ${status}`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  const productId = subscription.metadata?.product_id;

  if (!userId || !productId) {
    console.log("[stripe-webhook] subscription.deleted missing metadata, skipping");
    return;
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("Failed to cancel subscription:", error);
  } else {
    console.log(`[stripe-webhook] Subscription cancelled for user ${userId}`);
  }
}

async function getUserHomeStudioId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("home_studio_id")
    .eq("id", userId)
    .single();
  return data?.home_studio_id ?? null;
}
