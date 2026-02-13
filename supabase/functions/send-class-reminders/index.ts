import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const twoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoAndHalfHours = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    // Find confirmed bookings starting in 2–2.5 hours that haven't been reminded yet
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        class_id,
        user_id,
        classes!inner ( name, start_time ),
        profiles!inner ( phone, notification_preferences )
      `)
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("classes.start_time", twoHours.toISOString())
      .lte("classes.start_time", twoAndHalfHours.toISOString());

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return new Response(JSON.stringify({ error: bookingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const results: string[] = [];

    for (const booking of bookings ?? []) {
      const profile = booking.profiles as any;
      const classInfo = booking.classes as any;

      // Check user opted in for SMS and has a phone number
      const prefs = profile?.notification_preferences as { sms?: boolean } | null;
      if (!prefs?.sms || !profile?.phone) continue;

      const classTime = new Date(classInfo.start_time).toLocaleTimeString(
        "en-US",
        { hour: "numeric", minute: "2-digit" }
      );

      // TODO: Replace console.log with Twilio API call here
      const message = `Sending SMS to ${profile.phone}: Don't forget ${classInfo.name} at ${classTime}!`;
      console.log(message);
      results.push(message);

      // Mark reminder as sent
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ reminder_sent: true })
        .eq("id", booking.id);

      if (updateError) {
        console.error(`Failed to mark reminder_sent for booking ${booking.id}:`, updateError);
      } else {
        sentCount++;
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, messages: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
