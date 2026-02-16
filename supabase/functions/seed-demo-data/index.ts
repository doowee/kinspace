import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRST_NAMES = [
  "Ava","Liam","Sofia","Noah","Maya","Ethan","Chloe","Lucas","Isla","Mason",
  "Zara","Oliver","Luna","James","Mila","Logan","Aria","Jack","Ella","Ben",
];
const LAST_NAMES = [
  "Chen","Patel","Kim","Garcia","Nguyen","Muller","Costa","Ali","Singh","Torres",
  "Park","Brown","Lee","Taylor","Wilson","Davis","Clark","Hall","Young","Hill",
];

const CLASS_TEMPLATES = [
  { name: "Morning Flow", hour: 7, min: 0, capacity: 8 },
  { name: "Power Tower", hour: 9, min: 30, capacity: 6 },
  { name: "Advanced Reformer", hour: 11, min: 0, capacity: 8 },
  { name: "Sculpt & Stretch", hour: 12, min: 30, capacity: 10 },
  { name: "Beginner Reformer", hour: 14, min: 0, capacity: 10 },
  { name: "Core Blast", hour: 15, min: 30, capacity: 8 },
  { name: "Evening Restore", hour: 17, min: 0, capacity: 8 },
  { name: "Total Body Tower", hour: 18, min: 30, capacity: 6 },
  { name: "Pre-Natal Pilates", hour: 10, min: 0, capacity: 6 },
  { name: "Jumpboard Cardio", hour: 8, min: 0, capacity: 8 },
  { name: "Mat Foundations", hour: 16, min: 0, capacity: 12 },
  { name: "Athletic Reformer", hour: 6, min: 30, capacity: 8 },
  { name: "Reformer Express", hour: 12, min: 0, capacity: 8 },
];

const INSTRUCTOR_NAMES = [
  "Sarah Jenkins",
  "Mike Ross",
  "Emma Stone",
];

const TX_TEMPLATES = [
  { desc: "10-Class Pack", amount: 199 },
  { desc: "Unlimited Monthly VIP", amount: 249 },
  { desc: "Drop-in", amount: 35 },
  { desc: "5-Class Intro Pack", amount: 125 },
  { desc: "Private Session (1-on-1)", amount: 95 },
  { desc: "10-Class Pack Refill (SMS)", amount: 199 },
  { desc: "20-Class Bundle", amount: 349 },
  { desc: "Workshop - Reformer Intensive", amount: 75 },
  { desc: "Unlimited Monthly", amount: 189 },
  { desc: "Gift Card Redemption", amount: 150 },
];

const PACKAGE_TEMPLATES = [
  { name: "10-Class Pack", price: 199, credits: 10, expiration_days: 60 },
  { name: "5-Class Intro", price: 125, credits: 5, expiration_days: 30 },
  { name: "20-Class Bundle", price: 349, credits: 20, expiration_days: 90 },
];

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

    // Accept optional studio_id from request body
    const body = await req.json().catch(() => ({}));
    const customStudioId: string | null = body.studio_id ?? null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ─── 1. Create 20 auth users + profiles ───
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

      await supabaseAdmin.from("profiles").update({ phone }).eq("id", userId);
      studentIds.push(userId);
    }

    if (studentIds.length === 0) throw new Error("No students created");

    // Determine which studios to seed
    const studioIds: string[] = [];

    if (customStudioId) {
      // Verify studio exists
      const { data: studio } = await supabaseAdmin
        .from("studios")
        .select("id")
        .eq("id", customStudioId)
        .maybeSingle();
      if (studio) studioIds.push(customStudioId);
      else throw new Error("Studio not found");
    } else {
      // Fallback: use first two studios the service can find
      const { data: studios } = await supabaseAdmin
        .from("studios")
        .select("id")
        .limit(2);
      if (studios?.length) studioIds.push(...studios.map((s) => s.id));
    }

    if (studioIds.length === 0) throw new Error("No studios found to seed");

    // ─── 2. For each studio: create instructors, memberships, classes, bookings, transactions ───
    let totalClasses = 0;
    let totalBookings = 0;
    let totalTransactions = 0;
    let waitlistClassName = "none";

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

      // ── Packages ──
      const packageIds: string[] = [];
      for (const pkg of PACKAGE_TEMPLATES) {
        const { data: existingPkg } = await supabaseAdmin
          .from("packages")
          .select("id")
          .eq("studio_id", sid)
          .eq("name", pkg.name)
          .maybeSingle();

        if (existingPkg) {
          packageIds.push(existingPkg.id);
        } else {
          const { data: createdPkg, error: pkgErr } = await supabaseAdmin
            .from("packages")
            .insert({ ...pkg, studio_id: sid })
            .select("id")
            .single();
          if (pkgErr) {
            console.warn(`Package ${pkg.name}: ${pkgErr.message}`);
            continue;
          }
          packageIds.push(createdPkg.id);
        }
      }

      // ── Classes ──
      const dayOffsets = [-2, -1, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5];
      const classRows = CLASS_TEMPLATES.map((t, i) => {
        const d = addDays(today, dayOffsets[i]);
        d.setHours(t.hour, t.min, 0, 0);
        return {
          id: crypto.randomUUID(),
          name: t.name,
          studio_id: sid,
          instructor_id: instructorIds[i % instructorIds.length] ?? null,
          start_time: d.toISOString(),
          capacity: t.capacity,
          description: `${t.name} – ${t.capacity} spots`,
        };
      });

      const { error: classErr } = await supabaseAdmin
        .from("classes")
        .insert(classRows);
      if (classErr) console.warn(`Classes for ${sid}: ${classErr.message}`);
      else totalClasses += classRows.length;

      // ── Bookings ──
      const bookingRows: any[] = [];
      const tomorrowClasses = classRows.filter((c) => {
        const d = new Date(c.start_time);
        return d >= addDays(today, 1) && d < addDays(today, 2);
      });
      const waitlistClass = tomorrowClasses[0] ?? null;
      if (waitlistClass) waitlistClassName = waitlistClass.name;

      for (const cls of classRows) {
        const classDate = new Date(cls.start_time);
        const isPast = classDate < now;
        const isWaitlistTarget =
          waitlistClass && cls.id === waitlistClass.id;
        const shuffled = [...studentIds].sort(() => Math.random() - 0.5);

        if (isWaitlistTarget) {
          for (
            let j = 0;
            j < cls.capacity + 2 && j < shuffled.length;
            j++
          ) {
            bookingRows.push({
              class_id: cls.id,
              user_id: shuffled[j],
              studio_id: sid,
              status: j < cls.capacity ? "confirmed" : "waitlist",
            });
          }
        } else if (isPast) {
          const fill = Math.min(
            randInt(Math.ceil(cls.capacity * 0.8), cls.capacity),
            shuffled.length
          );
          for (let j = 0; j < fill; j++) {
            bookingRows.push({
              class_id: cls.id,
              user_id: shuffled[j],
              studio_id: sid,
              status: Math.random() > 0.3 ? "checked_in" : "confirmed",
            });
          }
        } else {
          const fill = Math.min(
            randInt(
              Math.ceil(cls.capacity * 0.5),
              Math.ceil(cls.capacity * 0.8)
            ),
            shuffled.length
          );
          for (let j = 0; j < fill; j++) {
            bookingRows.push({
              class_id: cls.id,
              user_id: shuffled[j],
              studio_id: sid,
              status: "confirmed",
            });
          }
        }
      }

      for (let i = 0; i < bookingRows.length; i += 50) {
        const { error: bErr } = await supabaseAdmin
          .from("bookings")
          .insert(bookingRows.slice(i, i + 50));
        if (bErr) console.warn("Booking batch:", bErr.message);
      }
      totalBookings += bookingRows.length;

      // ── Student Passes ──
      if (packageIds.length > 0) {
        const passRows = studentIds.map((uid) => ({
          user_id: uid,
          studio_id: sid,
          package_id: pick(packageIds),
          credits_remaining: randInt(0, 12),
          expires_at: addDays(now, randInt(14, 90)).toISOString(),
        }));
        const { error: passErr } = await supabaseAdmin
          .from("student_passes")
          .insert(passRows);
        if (passErr) console.warn("Pass:", passErr.message);
      }

      // ── Transactions (Finance Data) ──
      const txRows: any[] = [];
      for (let i = 0; i < 35; i++) {
        const template = pick(TX_TEMPLATES);
        const daysAgo = randInt(0, 30);
        const txDate = addDays(now, -daysAgo);
        txDate.setHours(randInt(6, 20), randInt(0, 59), 0, 0);

        txRows.push({
          studio_id: sid,
          user_id: pick(studentIds),
          amount: template.amount,
          description: template.desc,
          payment_method: pick(["card", "card", "card", "transfer"] as const),
          status: "completed",
          created_at: txDate.toISOString(),
        });
      }

      for (let i = 0; i < txRows.length; i += 50) {
        const { error: txErr } = await supabaseAdmin
          .from("transactions")
          .insert(txRows.slice(i, i + 50));
        if (txErr) console.warn("Transaction batch:", txErr.message);
      }
      totalTransactions += txRows.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        classCount: totalClasses,
        studentCount: studentIds.length,
        bookingCount: totalBookings,
        transactionCount: totalTransactions,
        waitlistClassName,
        studioCount: studioIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
