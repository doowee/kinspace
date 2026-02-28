import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting per user
const userSmsAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_SMS_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = userSmsAttempts.get(userId);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    userSmsAttempts.set(userId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_SMS_PER_HOUR) return true;
  entry.count += 1;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // 2. Authorize — only studio staff (owner/instructor) can send SMS
    const { data: staffCheck } = await supabase
      .from("studio_members")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "instructor"])
      .limit(1)
      .maybeSingle();

    if (!staffCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Rate limiting
    if (isRateLimited(userId)) {
      return new Response(
        JSON.stringify({ error: "Too many SMS requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validate input
    const { targetPhoneNumber, messageBody } = await req.json();

    if (!targetPhoneNumber || !messageBody) {
      return new Response(
        JSON.stringify({ error: "targetPhoneNumber and messageBody are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof targetPhoneNumber !== "string" || !/^\+[1-9]\d{1,14}$/.test(targetPhoneNumber)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use E.164 format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof messageBody !== "string" || messageBody.length > 1600) {
      return new Response(
        JSON.stringify({ error: "Message body must be a string under 1600 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Send SMS via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(
        JSON.stringify({ error: "SMS service is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: targetPhoneNumber,
      From: fromNumber,
      Body: messageBody,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-twilio-sms error:", e);
    return new Response(
      JSON.stringify({ error: "Unable to send SMS. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
