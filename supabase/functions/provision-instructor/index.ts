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

  // Validate caller with anon key + their token
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
    const {
      first_name,
      last_name,
      email,
      studio_id,
      authorized_studios,
      certified_class_types,
      pin_code,
    } = await req.json();

    if (!first_name || !last_name || !email || !studio_id) {
      throw new Error("Missing required fields: first_name, last_name, email, studio_id");
    }

    // Verify caller is an owner of this studio
    const { data: callerRole } = await supabase.rpc("get_studio_role", {
      _user_id: caller.id,
      _studio_id: studio_id,
    });
    if (callerRole !== "owner") {
      return new Response(JSON.stringify({ error: "Only studio owners can provision instructors" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if the user already exists in auth
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // User already exists — reuse their account
      userId = existingProfile.id;
    } else {
      // Create a new auth user with invite (sends password reset email)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
      });

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }
      userId = newUser.user.id;

      // Send an invite/password-setup email
      await supabase.auth.admin.inviteUserByEmail(normalizedEmail);
    }

    // Ensure profile has the right name fields
    await supabase
      .from("profiles")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
      })
      .eq("id", userId);

    // Upsert studio_members as instructor role
    const { data: existingMember } = await supabase
      .from("studio_members")
      .select("id, role")
      .eq("user_id", userId)
      .eq("studio_id", studio_id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from("studio_members").insert({
        user_id: userId,
        studio_id,
        role: "instructor",
      });
    } else if (existingMember.role === "student") {
      await supabase
        .from("studio_members")
        .update({ role: "instructor" })
        .eq("id", existingMember.id);
    }

    // Create the instructor record
    const { data: instructor, error: instError } = await supabase
      .from("instructors")
      .insert({
        name: `${first_name.trim()} ${last_name.trim()}`,
        user_id: userId,
        studio_id,
        authorized_studios: authorized_studios ?? [],
        certified_class_types: certified_class_types ?? [],
        pin_code: pin_code ?? null,
        display_order: 0,
      })
      .select("id")
      .single();

    if (instError) {
      throw new Error(`Failed to create instructor: ${instError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        instructor_id: instructor.id,
        user_id: userId,
        email: normalizedEmail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("provision-instructor error:", err);
    const safeMessage = err.message?.includes("duplicate")
      ? "An instructor with this email already exists."
      : "Unable to provision instructor. Please try again.";
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
