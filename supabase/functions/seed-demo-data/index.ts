import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRST_NAMES = ["Ava","Liam","Sofia","Noah","Maya","Ethan","Chloe","Lucas","Isla","Mason","Zara","Oliver","Luna","James","Mila","Logan","Aria","Jack","Ella","Ben"];
const LAST_NAMES = ["Chen","Patel","Kim","Garcia","Nguyen","Muller","Costa","Ali","Singh","Torres","Park","Brown","Lee","Taylor","Wilson","Davis","Clark","Hall","Young","Hill"];

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

const STUDIO_IDS = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"];
const INSTRUCTOR_IDS = ["9158219c-b86e-4e8a-83e1-0f529a204b55", "5cfce067-b56d-4c5c-90fc-2d809f144bc1", "a0e7e8fa-fb64-4da7-9d07-97222095ca95"];
const PACKAGE_IDS = ["57c8f0ff-34a5-4da5-b753-2464c2f70a7f", "98a2f1c6-3f91-483a-806a-e0df290ebb14", "76c63ebd-4e6d-4869-8c79-47c38db55eb8"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Create 20 student profiles
    const studentProfiles = FIRST_NAMES.map((first, i) => ({
      id: crypto.randomUUID(),
      email: `${first.toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@demo.kinspace.app`,
      first_name: first,
      last_name: LAST_NAMES[i],
      phone: `555-0${String(100 + i).slice(-3)}`,
    }));

    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(studentProfiles, { onConflict: "id" });
    if (profileErr) throw new Error(`Profiles: ${profileErr.message}`);

    // 2. Studio memberships
    const memberRows = studentProfiles.flatMap((p) =>
      STUDIO_IDS.map((sid) => ({ user_id: p.id, studio_id: sid, role: "student" }))
    );
    // Insert individually to skip duplicates
    for (const m of memberRows) {
      await supabaseAdmin.from("studio_members").upsert(m, { onConflict: "user_id,studio_id" as any }).single();
    }

    // 3. Create 13 classes
    const dayOffsets = [-2, -1, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5];
    const classRows = CLASS_TEMPLATES.map((t, i) => {
      const d = addDays(today, dayOffsets[i]);
      d.setHours(t.hour, t.min, 0, 0);
      return {
        id: crypto.randomUUID(),
        name: t.name,
        studio_id: STUDIO_IDS[i % STUDIO_IDS.length],
        instructor_id: INSTRUCTOR_IDS[i % INSTRUCTOR_IDS.length],
        start_time: d.toISOString(),
        capacity: t.capacity,
        description: `${t.name} – ${t.capacity} spots`,
      };
    });

    const { error: classErr } = await supabaseAdmin.from("classes").insert(classRows);
    if (classErr) throw new Error(`Classes: ${classErr.message}`);

    // 4. Bookings
    const bookingRows: any[] = [];
    const tomorrowClasses = classRows.filter((c) => {
      const d = new Date(c.start_time);
      return d >= addDays(today, 1) && d < addDays(today, 2);
    });
    const waitlistClass = tomorrowClasses[0] ?? null;

    for (const cls of classRows) {
      const classDate = new Date(cls.start_time);
      const isPast = classDate < now;
      const isWaitlistTarget = waitlistClass && cls.id === waitlistClass.id;
      const shuffled = [...studentProfiles].sort(() => Math.random() - 0.5);

      if (isWaitlistTarget) {
        for (let j = 0; j < cls.capacity + 2 && j < shuffled.length; j++) {
          bookingRows.push({
            class_id: cls.id, user_id: shuffled[j].id, studio_id: cls.studio_id,
            status: j < cls.capacity ? "confirmed" : "waitlist",
          });
        }
      } else if (isPast) {
        const fill = Math.min(randInt(Math.ceil(cls.capacity * 0.8), cls.capacity), shuffled.length);
        for (let j = 0; j < fill; j++) {
          bookingRows.push({
            class_id: cls.id, user_id: shuffled[j].id, studio_id: cls.studio_id,
            status: Math.random() > 0.3 ? "checked_in" : "confirmed",
          });
        }
      } else {
        const fill = Math.min(randInt(Math.ceil(cls.capacity * 0.5), Math.ceil(cls.capacity * 0.8)), shuffled.length);
        for (let j = 0; j < fill; j++) {
          bookingRows.push({
            class_id: cls.id, user_id: shuffled[j].id, studio_id: cls.studio_id,
            status: "confirmed",
          });
        }
      }
    }

    for (let i = 0; i < bookingRows.length; i += 50) {
      const { error: bErr } = await supabaseAdmin.from("bookings").insert(bookingRows.slice(i, i + 50));
      if (bErr) console.warn("Booking batch warning:", bErr.message);
    }

    // 5. Student passes
    const passRows = studentProfiles.map((p) => ({
      user_id: p.id,
      studio_id: pick(STUDIO_IDS),
      package_id: pick(PACKAGE_IDS),
      credits_remaining: randInt(0, 12),
      expires_at: addDays(now, randInt(14, 90)).toISOString(),
    }));

    const { error: passErr } = await supabaseAdmin.from("student_passes").insert(passRows);
    if (passErr) console.warn("Pass warning:", passErr.message);

    return new Response(JSON.stringify({
      success: true,
      classCount: classRows.length,
      studentCount: studentProfiles.length,
      bookingCount: bookingRows.length,
      waitlistClassName: waitlistClass?.name ?? "none",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
