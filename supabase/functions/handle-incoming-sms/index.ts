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

/**
 * Validate Twilio webhook signature to prevent spoofed requests.
 * Uses HMAC-SHA1 of the request URL + sorted POST params.
 */
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const mac = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return mac === signature;
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

    // 2. Validate Twilio webhook signature
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    
    if (!twilioSignature) {
      console.error("Missing Twilio signature header");
      return twimlResponse("Unauthorized.");
    }

    // Reconstruct the request URL and params for signature validation
    const requestUrl = req.url;
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const isValid = await validateTwilioSignature(
      twilioAuth,
      twilioSignature,
      requestUrl,
      params
    );

    if (!isValid) {
      console.error("Invalid Twilio webhook signature");
      return twimlResponse("Unauthorized.");
    }

    // Mask phone (keep last 4) and strip non-alphanumerics from body before logging.
    const maskedFrom = from.replace(/.(?=.{4})/g, "*");
    const safeBody = body.substring(0, 50).replace(/[^\w\s]/g, "");
    console.log(`Incoming SMS from ${maskedFrom}: "${safeBody}"`);

    // 2.5 Handle SMS opt-out / opt-in keywords (carrier-standard)
    const trimmed = body.trim().toUpperCase();
    const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
    const START_KEYWORDS = ["START", "UNSTOP", "YES"];

    if (STOP_KEYWORDS.includes(trimmed) || START_KEYWORDS.includes(trimmed)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const optOut = STOP_KEYWORDS.includes(trimmed);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          sms_opted_out: optOut,
          sms_opted_out_at: optOut ? new Date().toISOString() : null,
        })
        .eq("phone", from);
      if (updErr) console.warn("opt-out update failed", updErr);
      // Twilio auto-injects STOP/START confirmations; return empty TwiML
      return twimlResponse("");
    }

    // 3. Check for CLAIM keyword (case-insensitive)
    if (!body.toUpperCase().includes("CLAIM")) {
      console.log("Message does not contain CLAIM, ignoring.");
      return twimlResponse("Thanks for your message! Reply CLAIM to secure your spot.");
    }

    // 4. Rate limiting
    if (isRateLimited(from)) {
      console.log(`Rate limited: ${from}`);
      return twimlResponse("You've reached the maximum claims for this hour. Please try again later.");
    }

    // 5. Database lookup — find profile by phone number
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

    // 6. Find the next upcoming class
    const { data: upcomingClass } = await supabase
      .from("classes")
      .select("id, studio_id")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!upcomingClass) {
      console.log("No upcoming classes found");
      return twimlResponse("No upcoming classes available right now.");
    }

    // 7. Verify user is a member of this studio before charging
    const { data: membership } = await supabase
      .from("studio_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("studio_id", upcomingClass.studio_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      console.log(`User ${profile.id} is not a member of studio ${upcomingClass.studio_id}`);
      return twimlResponse("You're not registered with this studio. Please contact them to sign up.");
    }

    // 8. Check capacity before charging (don't charge if class is full)
    const { count: confirmedCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("class_id", upcomingClass.id)
      .eq("status", "confirmed");

    const { data: classInfo } = await supabase
      .from("classes")
      .select("capacity_total")
      .eq("id", upcomingClass.id)
      .single();

    if (classInfo && (confirmedCount ?? 0) >= classInfo.capacity_total) {
      return twimlResponse("Sorry, this class is full! Try again for the next one.");
    }

    // 9. Check for duplicate booking (idempotency)
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", profile.id)
      .eq("class_id", upcomingClass.id)
      .in("status", ["confirmed", "waitlist"])
      .maybeSingle();

    if (existingBooking) {
      return twimlResponse("You're already booked for this class! See you there.");
    }

    // 10. Stripe 1-Tap Charge — $35.00 USD
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
      console.error("Stripe charge failed:", paymentIntent.error?.message || "Unknown error");
      return twimlResponse("We couldn't process your payment. Please contact the studio.");
    }

    console.log(`Stripe PaymentIntent ${paymentIntent.id} succeeded for ${profile.id}`);

    // 11. Insert booking record (flash_sale source)
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

    // 12. Record the transaction
    await supabase.from("transactions").insert({
      user_id: profile.id,
      studio_id: upcomingClass.studio_id,
      amount: 35,
      payment_method: "card",
      status: "completed",
      type: "flash_sale",
      description: "Flash Drop — 1-tap SMS checkout",
    });

    // 13. Send confirmation SMS via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
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
