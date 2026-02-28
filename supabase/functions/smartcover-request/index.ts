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

    // Fetch class details with studio info
    const { data: cls, error: clsError } = await supabase
      .from("classes")
      .select("id, name, class_type, studio_id, instructor_id, start_time")
      .eq("id", class_id)
      .single();

    if (clsError || !cls) throw new Error("Class not found");

    // Fetch studio name
    const { data: studio } = await supabase
      .from("studios")
      .select("name, organization_id")
      .eq("id", cls.studio_id)
      .single();

    // Find the requesting instructor
    const requestingInstructorId = cls.instructor_id;
    let requestingInstructorName = "Unknown Instructor";

    if (requestingInstructorId) {
      const { data: inst } = await supabase
        .from("instructors")
        .select("id, name")
        .eq("id", requestingInstructorId)
        .single();
      if (inst) requestingInstructorName = inst.name;
    }

    // Query eligible instructors
    let query = supabase
      .from("instructors")
      .select("id, name, user_id")
      .contains("authorized_studios", [cls.studio_id]);

    if (cls.class_type) {
      query = query.contains("certified_class_types", [cls.class_type]);
    }

    if (requestingInstructorId) {
      query = query.neq("id", requestingInstructorId);
    }

    query = query.not("user_id", "is", null);

    const { data: eligible, error: eligibleError } = await query;
    if (eligibleError) throw new Error("Failed to query eligible instructors");

    const eligibleCount = eligible?.length ?? 0;
    const isEscalation = eligibleCount === 0;

    // Persist the cover request
    const coverRequestStatus = isEscalation ? "escalated" : "pending";
    const { data: coverRequest, error: crError } = await supabase
      .from("cover_requests")
      .insert({
        class_id: cls.id,
        requesting_instructor_id: requestingInstructorId,
        studio_id: cls.studio_id,
        status: coverRequestStatus,
        eligible_count: eligibleCount,
      })
      .select("id")
      .single();

    if (crError) {
      console.error("Failed to create cover request:", crError.message);
    }

    // If zero matches → escalate to owners/admins
    if (isEscalation) {
      // Find all owners and admins for this studio
      const { data: managers } = await supabase
        .from("studio_members")
        .select("user_id, role")
        .eq("studio_id", cls.studio_id)
        .in("role", ["owner", "admin"]);

      // Also find org-level owners if org exists
      let orgManagers: any[] = [];
      if (studio?.organization_id) {
        const { data: orgStudios } = await supabase
          .from("studios")
          .select("id")
          .eq("organization_id", studio.organization_id);

        if (orgStudios && orgStudios.length > 0) {
          const { data: orgOwners } = await supabase
            .from("studio_members")
            .select("user_id, role")
            .in("studio_id", orgStudios.map((s: any) => s.id))
            .eq("role", "owner");
          orgManagers = orgOwners ?? [];
        }
      }

      // Deduplicate manager user IDs
      const allManagerIds = [
        ...new Set([
          ...(managers ?? []).map((m: any) => m.user_id),
          ...orgManagers.map((m: any) => m.user_id),
        ]),
      ];

      const classDateTime = new Date(cls.start_time).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const alertMessage = `🚨 UNCOVERED CLASS: ${requestingInstructorName} requested a sub for "${cls.name}" at ${studio?.name ?? "Unknown Studio"} on ${classDateTime}, but no eligible staff are available. Manual intervention required.`;

      console.log(`[SmartCover Escalation] ${alertMessage}`);
      console.log(`[SmartCover Escalation] Notifying ${allManagerIds.length} manager(s): ${allManagerIds.join(", ")}`);

      // In the future: send SMS/push/email to each manager
      // For now, logged and returned in the response
    }

    return new Response(
      JSON.stringify({
        success: true,
        eligible_count: eligibleCount,
        eligible_instructors: (eligible ?? []).map((i: any) => ({ id: i.id, name: i.name })),
        class_name: cls.name,
        class_type: cls.class_type,
        studio_name: studio?.name ?? "",
        start_time: cls.start_time,
        instructor_name: requestingInstructorName,
        escalated: isEscalation,
        cover_request_id: coverRequest?.id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("smartcover-request error:", err);
    return new Response(
      JSON.stringify({ error: "Unable to process cover request. Please try again." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
