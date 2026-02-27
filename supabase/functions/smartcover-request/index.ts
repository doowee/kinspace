import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { class_id } = await req.json();
    if (!class_id) throw new Error("Missing class_id");

    // Fetch the class details including class_type and studio_id
    const { data: cls, error: clsError } = await supabase
      .from("classes")
      .select("id, name, class_type, studio_id, instructor_id")
      .eq("id", class_id)
      .single();

    if (clsError || !cls) throw new Error("Class not found");

    // Find the requesting instructor to exclude them
    const requestingInstructorId = cls.instructor_id;

    // Query eligible instructors:
    // 1. authorized_studios array contains the class's studio_id
    // 2. certified_class_types array contains the class's class_type
    // 3. Not the requesting instructor
    let query = supabase
      .from("instructors")
      .select("id, name, user_id")
      .contains("authorized_studios", [cls.studio_id]);

    // Only filter by class_type if the class has one set
    if (cls.class_type) {
      query = query.contains("certified_class_types", [cls.class_type]);
    }

    if (requestingInstructorId) {
      query = query.neq("id", requestingInstructorId);
    }

    // Only instructors with a linked user account can receive notifications
    query = query.not("user_id", "is", null);

    const { data: eligible, error: eligibleError } = await query;

    if (eligibleError) throw new Error("Failed to query eligible instructors");

    const eligibleCount = eligible?.length ?? 0;

    // In the future, this is where you'd send SMS/push notifications to each eligible instructor.
    // For now, we return the count and eligible instructor names.

    return new Response(
      JSON.stringify({
        success: true,
        eligible_count: eligibleCount,
        eligible_instructors: (eligible ?? []).map((i: any) => ({ id: i.id, name: i.name })),
        class_name: cls.name,
        class_type: cls.class_type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
