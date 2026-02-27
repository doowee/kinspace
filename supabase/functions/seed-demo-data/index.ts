import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── Name pools ── */
const FIRST_NAMES = [
  "Ava","Liam","Sofia","Noah","Maya","Ethan","Chloe","Lucas","Isla","Mason",
  "Zara","Oliver","Luna","James","Mila","Logan","Aria","Jack","Ella","Ben",
  "Harper","Leo","Nora","Owen","Lily","Henry","Grace","Finn","Ivy","Caleb",
  "Ruby","Max","Stella","Jake","Hazel","Sam","Clara","Dylan","Piper","Ryan",
];
const LAST_NAMES = [
  "Chen","Patel","Kim","Garcia","Nguyen","Muller","Costa","Ali","Singh","Torres",
  "Park","Brown","Lee","Taylor","Wilson","Davis","Clark","Hall","Young","Hill",
  "Adams","Baker","Carter","Reed","Mitchell","Ross","Perry","Gray","Fox","Ward",
  "Lane","Knight","Cole","Watts","Stone","Wells","Webb","Holt","West","Grant",
];

const CLASS_NAMES = [
  "Morning Reformer Flow","Power Tower","Advanced Reformer","Sculpt & Stretch",
  "Beginner Reformer","Core Blast","Evening Restore","Total Body Tower",
  "Pre-Natal Pilates","Jumpboard Dynamics","Mat Foundations","Athletic Reformer",
  "Reformer Express","HIIT Pilates","Barre Fusion","Stretch & Release",
  "Tower Sculpt","Cardio Reformer","Pilates for Runners","Deep Core Restore",
];

const INSTRUCTOR_NAMES = ["Sarah Jenkins","Mike Ross","Emma Stone"];

/* ── Demo persona constants ── */
const DEMO_INSTRUCTOR_NAME = "Elena Voss";
const DEMO_INSTRUCTOR_USER_ID = "5a04866e-05c2-4040-a8ea-86d5ea379f84";
const DEMO_STUDENT_USER_ID = "d4e1b69b-bc2c-4e16-9875-0938910a96c5"; // Jen Woohoo

/* ── Helpers ── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const customStudioId: string | null = body.studio_id ?? null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    /* ═══════════════════════════════════════════════════════════
       1. Resolve studios to seed
    ═══════════════════════════════════════════════════════════ */
    const studioIds: string[] = [];
    let orgId: string | null = null;

    if (customStudioId) {
      const { data: studio } = await supabaseAdmin
        .from("studios")
        .select("id, organization_id")
        .eq("id", customStudioId)
        .maybeSingle();
      if (!studio) throw new Error("Studio not found");
      studioIds.push(customStudioId);
      orgId = studio.organization_id;

      // Also grab sibling studios in same org
      if (orgId) {
        const { data: siblings } = await supabaseAdmin
          .from("studios")
          .select("id")
          .eq("organization_id", orgId)
          .neq("id", customStudioId);
        if (siblings) studioIds.push(...siblings.map((s) => s.id));
      }
    } else {
      const { data: studios } = await supabaseAdmin
        .from("studios")
        .select("id, organization_id")
        .limit(3);
      if (studios?.length) {
        studioIds.push(...studios.map((s) => s.id));
        orgId = studios[0].organization_id;
      }
    }

    if (studioIds.length === 0) throw new Error("No studios found to seed");

    /* ═══════════════════════════════════════════════════════════
       2. Clean previous demo data (bookings, transactions, classes)
       — avoids infinite duplicates on re-seed
    ═══════════════════════════════════════════════════════════ */
    for (const sid of studioIds) {
      await supabaseAdmin.from("bookings").delete().eq("studio_id", sid);
      await supabaseAdmin.from("transactions").delete().eq("studio_id", sid);
      await supabaseAdmin.from("classes").delete().eq("studio_id", sid);
    }

    /* ═══════════════════════════════════════════════════════════
       3. Create 40 auth users + profiles, link to org
    ═══════════════════════════════════════════════════════════ */
    const studentIds: string[] = [];

    for (let i = 0; i < FIRST_NAMES.length; i++) {
      const email = `${FIRST_NAMES[i].toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@demo.kinspace.app`;
      const phone = `555-0${String(100 + i).slice(-3)}`;

      const { data: authUser, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: "demo-password-123!",
          email_confirm: true,
          user_metadata: {
            first_name: FIRST_NAMES[i],
            last_name: LAST_NAMES[i],
            phone,
          },
        });

      let userId: string;
      if (authErr) {
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!existing) {
          console.warn(`Skipping ${email}: ${authErr.message}`);
          continue;
        }
        userId = existing.id;
      } else {
        userId = authUser.user.id;
      }

      // Update profile with org linkage and home studio
      const homeStudioId = pick(studioIds);
      await supabaseAdmin
        .from("profiles")
        .update({
          phone,
          organization_id: orgId,
          home_studio_id: homeStudioId,
        })
        .eq("id", userId);

      studentIds.push(userId);
    }

    if (studentIds.length === 0) throw new Error("No students created");

    /* ═══════════════════════════════════════════════════════════
       4. Per-studio: instructors, memberships, 30 days of classes
    ═══════════════════════════════════════════════════════════ */
    let totalClasses = 0;
    let totalBookings = 0;
    let totalTransactions = 0;

    for (const sid of studioIds) {
      // ── Instructors ──
      const instructorIds: string[] = [];
      for (const instName of INSTRUCTOR_NAMES) {
        const { data: existing } = await supabaseAdmin
          .from("instructors")
          .select("id")
          .eq("studio_id", sid)
          .eq("name", instName)
          .maybeSingle();

        if (existing) {
          instructorIds.push(existing.id);
        } else {
          const { data: created, error: instErr } = await supabaseAdmin
            .from("instructors")
            .insert({ name: instName, studio_id: sid })
            .select("id")
            .single();
          if (instErr) {
            console.warn(`Instructor ${instName}: ${instErr.message}`);
            continue;
          }
          instructorIds.push(created.id);
        }
      }

      // ── Studio memberships ──
      for (const uid of studentIds) {
        await supabaseAdmin
          .from("studio_members")
          .upsert(
            { user_id: uid, studio_id: sid, role: "student" },
            { onConflict: "user_id,studio_id" as any }
          );
      }

      // ── 30 days of classes (2-3 per day) ──
      const classRows: any[] = [];
      for (let dayOffset = -30; dayOffset <= 0; dayOffset++) {
        const classCount = randInt(2, 3);
        for (let c = 0; c < classCount; c++) {
          const d = addDays(today, dayOffset);
          const hour = pick([7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18]);
          const min = pick([0, 15, 30, 45]);
          d.setHours(hour, min, 0, 0);
          classRows.push({
            id: crypto.randomUUID(),
            name: pick(CLASS_NAMES),
            studio_id: sid,
            instructor_id: pick(instructorIds),
            start_time: d.toISOString(),
            capacity_total: randInt(8, 12),
            description: `Demo class`,
          });
        }
      }

      // Also add a few future classes (next 5 days)
      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const classCount = randInt(2, 3);
        for (let c = 0; c < classCount; c++) {
          const d = addDays(today, dayOffset);
          const hour = pick([7, 9, 11, 14, 17, 18]);
          const min = pick([0, 30]);
          d.setHours(hour, min, 0, 0);
          classRows.push({
            id: crypto.randomUUID(),
            name: pick(CLASS_NAMES),
            studio_id: sid,
            instructor_id: pick(instructorIds),
            start_time: d.toISOString(),
            capacity_total: randInt(8, 12),
            description: `Demo class`,
          });
        }
      }

      // Insert classes in batches
      for (let i = 0; i < classRows.length; i += 50) {
        const { error: classErr } = await supabaseAdmin
          .from("classes")
          .insert(classRows.slice(i, i + 50));
        if (classErr) console.warn(`Classes for ${sid}: ${classErr.message}`);
      }
      totalClasses += classRows.length;

      // ── Bookings: 5-10 per class ──
      const bookingRows: any[] = [];
      for (const cls of classRows) {
        const classDate = new Date(cls.start_time);
        const isPast = classDate < now;
        const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
        const fill = randInt(5, Math.min(10, shuffled.length));

        for (let j = 0; j < fill; j++) {
          bookingRows.push({
            class_id: cls.id,
            user_id: shuffled[j],
            studio_id: sid,
            status: isPast
              ? (Math.random() > 0.3 ? "checked_in" : "confirmed")
              : (j < cls.capacity_total ? "confirmed" : "waitlist"),
            created_at: cls.start_time, // same day as class
          });
        }
      }

      for (let i = 0; i < bookingRows.length; i += 50) {
        const { error: bErr } = await supabaseAdmin
          .from("bookings")
          .insert(bookingRows.slice(i, i + 50));
        if (bErr) console.warn("Booking batch:", bErr.message);
      }
      totalBookings += bookingRows.length;
    }

    /* ═══════════════════════════════════════════════════════════
       5. Transactions — revenue engine spread across 30 days
       Distributed across all studios with backdated created_at
    ═══════════════════════════════════════════════════════════ */
    const txRows: any[] = [];

    // Monthly Unlimited purchases: 15-20
    const unlimitedCount = randInt(15, 20);
    for (let i = 0; i < unlimitedCount; i++) {
      const daysAgo = randInt(0, 30);
      const txDate = addDays(now, -daysAgo);
      txDate.setHours(randInt(6, 20), randInt(0, 59), 0, 0);
      txRows.push({
        studio_id: pick(studioIds),
        user_id: pick(studentIds),
        amount: 250,
        description: "Monthly Unlimited",
        payment_method: pick(["card", "card", "card", "transfer"]),
        status: "completed",
        created_at: txDate.toISOString(),
      });
    }

    // 10-Class Pack purchases: 20-30
    const packCount = randInt(20, 30);
    for (let i = 0; i < packCount; i++) {
      const daysAgo = randInt(0, 30);
      const txDate = addDays(now, -daysAgo);
      txDate.setHours(randInt(6, 20), randInt(0, 59), 0, 0);
      txRows.push({
        studio_id: pick(studioIds),
        user_id: pick(studentIds),
        amount: 199,
        description: "10-Class Pack",
        payment_method: pick(["card", "card", "transfer"]),
        status: "completed",
        created_at: txDate.toISOString(),
      });
    }

    // Flash Sale drop-ins: 10-15
    const flashCount = randInt(10, 15);
    for (let i = 0; i < flashCount; i++) {
      const daysAgo = randInt(0, 30);
      const txDate = addDays(now, -daysAgo);
      txDate.setHours(randInt(6, 20), randInt(0, 59), 0, 0);
      txRows.push({
        studio_id: pick(studioIds),
        user_id: pick(studentIds),
        amount: 35,
        description: "Flash Sale Drop-in",
        payment_method: "card",
        status: "completed",
        created_at: txDate.toISOString(),
      });
    }

    // Insert all transactions in batches
    for (let i = 0; i < txRows.length; i += 50) {
      const { error: txErr } = await supabaseAdmin
        .from("transactions")
        .insert(txRows.slice(i, i + 50));
      if (txErr) console.warn("Transaction batch:", txErr.message);
    }
    totalTransactions = txRows.length;

    return new Response(
      JSON.stringify({
        success: true,
        classCount: totalClasses,
        studentCount: studentIds.length,
        bookingCount: totalBookings,
        transactionCount: totalTransactions,
        studioCount: studioIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
