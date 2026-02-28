import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting per phone number
const claimAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_CLAIMS_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = claimAttempts.get(phone);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    claimAttempts.set(phone, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_CLAIMS_PER_HOUR) return true;
  entry.count += 1;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Parse Twilio webhook (application/x-www-form-urlencoded)
    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";

    // Validate phone number format (E.164)
    if (!/^\+[1-9]\d{1,14}$/.test(from)) {
      console.log(`Invalid phone number format: ${from}`);
      return twimlResponse("Invalid phone number.");
    }

    // Validate body length
    if (body.length > 320) {
      console.log(`Message body too long (${body.length} chars)`);
      return twimlResponse("Message too long.");
    }

    console.log(`Incoming SMS from ${from}: "${body.substring(0, 50)}"`);

    // 2. Check for CLAIM keyword (case-insensitive)
    if (!body.toUpperCase().includes("CLAIM")) {
      console.log("Message does not contain CLAIM, ignoring.");
      return twimlResponse("Thanks for your message! Reply CLAIM to secure your spot.");
    }

    // 3. Rate limiting
    if (isRateLimited(from)) {
      console.log(`Rate limited: ${from}`);
      return twimlResponse("You've reached the maximum claims for this hour. Please try again later.");
    }

    // 4. Database lookup — find profile by phone number
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, first_name")
      .eq("phone", from)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return twimlResponse("Something went wrong. Please try again later.");
    }

    if (!profile) {
      console.log(`No profile found for phone: ${from}`);
      return twimlResponse("We couldn't find your account. Please contact the studio directly.");
    }

    if (!profile.stripe_customer_id) {
      console.log(`No Stripe customer for profile ${profile.id}`);
      return twimlResponse("We don't have a payment method on file. Please contact the studio to set one up.");
    }

    // 5. Stripe 1-Tap Charge — $35.00 USD
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const amountCents = 3500; // $35.00

    const paymentIntentRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: amountCents.toString(),
        currency: "usd",
        customer: profile.stripe_customer_id,
        confirm: "true",
        off_session: "true",
        description: "Flash Drop — Discounted Class Spot",
      }).toString(),
    });

    const paymentIntent = await paymentIntentRes.json();

    if (!paymentIntentRes.ok || paymentIntent.error) {
      const errMsg = paymentIntent.error?.message || `Stripe error [${paymentIntentRes.status}]`;
      console.error("Stripe charge failed:", errMsg);
      return twimlResponse("We couldn't process your payment. Please contact the studio.");
    }

    console.log(`Stripe PaymentIntent ${paymentIntent.id} succeeded for ${profile.id}`);

    // 6. Insert booking record (flash_sale source)
    const { data: upcomingClass } = await supabase
      .from("classes")
      .select("id, studio_id")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (upcomingClass) {
      const { error: bookingError } = await supabase.from("bookings").insert({
        user_id: profile.id,
        class_id: upcomingClass.id,
        studio_id: upcomingClass.studio_id,
        booking_source: "flash_sale",
        status: "confirmed",
      });

      if (bookingError) {
        console.error("Booking insert error:", bookingError);
      }

      await supabase.rpc("increment_capacity_booked" as any, { _class_id: upcomingClass.id }).catch(() => {
        console.log("capacity_booked increment skipped (no RPC)");
      });
    }

    // 7. Record the transaction
    if (upcomingClass) {
      await supabase.from("transactions").insert({
        user_id: profile.id,
        studio_id: upcomingClass.studio_id,
        amount: 35,
        payment_method: "card",
        status: "completed",
        type: "flash_sale",
        description: "Flash Drop — 1-tap SMS checkout",
      });
    }

    // 8. Send confirmation SMS via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: from,
          From: twilioFrom,
          Body: "⚡ You got it! Your card was charged $35 and your spot is secured. Hustle over!",
        }).toString(),
      }
    );

    return twimlResponse("");
  } catch (e) {
    console.error("handle-incoming-sms error:", e);
    return twimlResponse("An error occurred. Please try again.");
  }
});

function twimlResponse(message: string): Response {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
