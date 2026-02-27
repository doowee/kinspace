import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    if (!pin_code || !studio_id || pin_code.length !== 4) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instructor = instructors[0];

    // Find their next upcoming class at this studio
    const { data: nextClass } = await supabase
      .from("classes")
      .select("id, name, start_time, capacity_total, studio_id")
      .eq("instructor_id", instructor.id)
      .gte("start_time", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Include classes started up to 2h ago
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
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
