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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service role client for admin operations
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { instructor_id, studio_id } = await req.json();

    if (!instructor_id || !studio_id) {
      throw new Error("Missing required fields: instructor_id, studio_id");
    }

    // Verify caller is an owner of this studio
    const { data: callerRole } = await supabase.rpc("get_studio_role", {
      _user_id: caller.id,
      _studio_id: studio_id,
    });
    if (callerRole !== "owner") {
      return new Response(JSON.stringify({ error: "Only studio owners can offboard instructors" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the instructor record
    const { data: instructor, error: instErr } = await supabase
      .from("instructors")
      .select("id, user_id, name, studio_id")
      .eq("id", instructor_id)
      .single();

    if (instErr || !instructor) {
      throw new Error("Instructor not found");
    }

    // 1. Soft Delete: set is_active = false on the instructor record
    await supabase
      .from("instructors")
      .update({ is_active: false } as any)
      .eq("id", instructor_id);

    // 2. Orphan future classes: set instructor_id = NULL for upcoming classes
    const { data: orphanedClasses } = await supabase
      .from("classes")
      .update({ instructor_id: null })
      .eq("instructor_id", instructor_id)
      .gt("start_time", new Date().toISOString())
      .select("id");

    const orphanedCount = orphanedClasses?.length ?? 0;

    // 3. Deactivate studio membership
    if (instructor.user_id) {
      await supabase
        .from("studio_members")
        .update({ is_active: false })
        .eq("user_id", instructor.user_id)
        .eq("studio_id", studio_id);

      // 4. Suspend the auth account (ban)
      await supabase.auth.admin.updateUserById(instructor.user_id, {
        ban_duration: "876600h", // ~100 years
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        instructor_name: instructor.name,
        orphaned_classes: orphanedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("offboard-instructor error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
