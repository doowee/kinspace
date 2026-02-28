import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory rate limiting (per instance)
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(studioId: string, ip: string): string {
  return `${studioId}:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const entry = attempts.get(key);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > Date.now()) {
    const retryAfterSec = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfterSec };
  }

  // Reset if lockout expired
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    attempts.delete(key);
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    const retryAfterSec = Math.ceil(LOCKOUT_MS / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  attempts.set(key, entry);
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { pin_code, studio_id } = await req.json();

    if (!pin_code || !studio_id || typeof pin_code !== "string" || pin_code.length !== 4 || !/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = getRateLimitKey(studio_id, clientIp);
    const { allowed, retryAfterSec } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    // Find instructor with this PIN in this studio (or org-wide)
    const { data: studioRow } = await supabase
      .from("studios")
      .select("organization_id")
      .eq("id", studio_id)
      .single();

    let studioIds = [studio_id];
    if (studioRow?.organization_id) {
      const { data: orgStudios } = await supabase
        .from("studios")
        .select("id")
        .eq("organization_id", studioRow.organization_id);
      if (orgStudios?.length) studioIds = orgStudios.map((s: any) => s.id);
    }

    const { data: instructors } = await supabase
      .from("instructors")
      .select("id, name, user_id, studio_id")
      .eq("pin_code", pin_code)
      .eq("is_active", true)
      .in("studio_id", studioIds);

    if (!instructors || instructors.length === 0) {
      recordFailedAttempt(rateLimitKey);
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - clear attempts
    clearAttempts(rateLimitKey);
    const instructor = instructors[0];

    // Find their next upcoming class at this studio
    const { data: nextClass } = await supabase
      .from("classes")
      .select("id, name, start_time, capacity_total, studio_id")
      .eq("instructor_id", instructor.id)
      .gte("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        instructor_id: instructor.id,
        instructor_name: instructor.name,
        user_id: instructor.user_id,
        next_class: nextClass ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("kiosk-pin-login error:", err);
    return new Response(
      JSON.stringify({ error: "Unable to process request. Please try again." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
