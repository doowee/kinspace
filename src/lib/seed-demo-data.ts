import { supabase } from "@/integrations/supabase/client";
import { addDays, subDays, setHours, setMinutes } from "date-fns";

const FIRST_NAMES = [
  "Ava", "Liam", "Sofia", "Noah", "Maya", "Ethan", "Chloe", "Lucas",
  "Isla", "Mason", "Zara", "Oliver", "Luna", "James", "Mila", "Logan",
  "Aria", "Jack", "Ella", "Ben",
];
const LAST_NAMES = [
  "Chen", "Patel", "Kim", "Garcia", "Nguyen", "Müller", "Costa", "Ali",
  "Singh", "Torres", "Park", "Brown", "Lee", "Taylor", "Wilson", "Davis",
  "Clark", "Hall", "Young", "Hill",
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

interface SeedConfig {
  studioIds: string[];
  instructorIds: string[];
  packageIds: string[];
  orgId: string;
}

// For Downtown/Uptown pilates studios
const DEFAULT_CONFIG: SeedConfig = {
  studioIds: [
    "11111111-1111-1111-1111-111111111111", // Downtown
    "22222222-2222-2222-2222-222222222222", // Uptown
  ],
  instructorIds: [
    "9158219c-b86e-4e8a-83e1-0f529a204b55", // Jordan Lee
    "5cfce067-b56d-4c5c-90fc-2d809f144bc1", // Priya Sharma
    "a0e7e8fa-fb64-4da7-9d07-97222095ca95", // Elena Voss
  ],
  packageIds: [
    "57c8f0ff-34a5-4da5-b753-2464c2f70a7f", // Drop-In
    "98a2f1c6-3f91-483a-806a-e0df290ebb14", // 5-Class
    "76c63ebd-4e6d-4869-8c79-47c38db55eb8", // 10-Class
  ],
  orgId: "e4193d98-5569-4463-969f-371d73982a6e",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedDemoData(activeStudioId?: string) {
  const config = DEFAULT_CONFIG;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ── 1. Create 20 dummy student profiles ──────────────────────
  const studentProfiles = FIRST_NAMES.map((first, i) => ({
    id: crypto.randomUUID(),
    email: `${first.toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@demo.kinspace.app`,
    first_name: first,
    last_name: LAST_NAMES[i],
    phone: `555-0${String(100 + i).slice(-3)}`,
  }));

  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert(studentProfiles, { onConflict: "id" });
  if (profileErr) throw profileErr;

  // Create studio_members for each student in both studios
  const memberRows = studentProfiles.flatMap((p) =>
    config.studioIds.map((sid) => ({
      user_id: p.id,
      studio_id: sid,
      role: "student" as const,
    }))
  );
  const { error: memberErr } = await supabase
    .from("studio_members")
    .upsert(memberRows, { onConflict: "user_id,studio_id" as any });
  if (memberErr) console.warn("Member upsert warning:", memberErr.message);

  // ── 2. Create 13 classes across the week ─────────────────────
  const classRows: {
    id: string;
    name: string;
    studio_id: string;
    instructor_id: string;
    start_time: string;
    capacity: number;
    description: string;
  }[] = [];

  // Days: -2, -1, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5
  const dayOffsets = [-2, -1, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 5];

  for (let i = 0; i < CLASS_TEMPLATES.length; i++) {
    const t = CLASS_TEMPLATES[i];
    const dayOffset = dayOffsets[i];
    const studioId = config.studioIds[i % config.studioIds.length];
    const instructorId = config.instructorIds[i % config.instructorIds.length];
    const startTime = setMinutes(
      setHours(addDays(today, dayOffset), t.hour),
      t.min
    );

    classRows.push({
      id: crypto.randomUUID(),
      name: t.name,
      studio_id: studioId,
      instructor_id: instructorId,
      start_time: startTime.toISOString(),
      capacity: t.capacity,
      description: `${t.name} – ${t.capacity} spots`,
    });
  }

  const { error: classErr } = await supabase.from("classes").insert(classRows);
  if (classErr) throw classErr;

  // ── 3. Create bookings ───────────────────────────────────────
  const bookingRows: {
    class_id: string;
    user_id: string;
    studio_id: string;
    status: string;
  }[] = [];

  // Find the "waitlist-ready" class: first class tomorrow with capacity that allows it
  const tomorrowClasses = classRows.filter((c) => {
    const d = new Date(c.start_time);
    return d >= addDays(today, 1) && d < addDays(today, 2);
  });
  const waitlistClass =
    tomorrowClasses.length > 0 ? tomorrowClasses[0] : null;

  const usedStudents = new Set<string>();

  for (const cls of classRows) {
    const classDate = new Date(cls.start_time);
    const isPast = classDate < now;
    const isWaitlistTarget = waitlistClass && cls.id === waitlistClass.id;

    // Shuffle students for variety
    const shuffled = [...studentProfiles].sort(() => Math.random() - 0.5);
    usedStudents.clear();

    if (isWaitlistTarget) {
      // Fill to 100% + 2 waitlist
      const confirmedCount = cls.capacity;
      const waitlistCount = 2;

      for (let j = 0; j < confirmedCount + waitlistCount && j < shuffled.length; j++) {
        bookingRows.push({
          class_id: cls.id,
          user_id: shuffled[j].id,
          studio_id: cls.studio_id,
          status: j < confirmedCount ? "confirmed" : "waitlist",
        });
      }
    } else if (isPast) {
      // Past classes: 80-100% filled, all checked_in or confirmed
      const fillCount = Math.min(
        randInt(Math.ceil(cls.capacity * 0.8), cls.capacity),
        shuffled.length
      );
      for (let j = 0; j < fillCount; j++) {
        bookingRows.push({
          class_id: cls.id,
          user_id: shuffled[j].id,
          studio_id: cls.studio_id,
          status: Math.random() > 0.3 ? "checked_in" : "confirmed",
        });
      }
    } else {
      // Future classes: ~80% fill
      const fillCount = Math.min(
        randInt(Math.ceil(cls.capacity * 0.5), Math.ceil(cls.capacity * 0.8)),
        shuffled.length
      );
      for (let j = 0; j < fillCount; j++) {
        bookingRows.push({
          class_id: cls.id,
          user_id: shuffled[j].id,
          studio_id: cls.studio_id,
          status: "confirmed",
        });
      }
    }
  }

  // Insert bookings in chunks to avoid hitting limits
  for (let i = 0; i < bookingRows.length; i += 50) {
    const chunk = bookingRows.slice(i, i + 50);
    const { error: bErr } = await supabase
      .from("bookings")
      .insert(chunk as any);
    if (bErr) console.warn("Booking insert warning:", bErr.message);
  }

  // ── 4. Create student passes ─────────────────────────────────
  const passRows = studentProfiles.map((p) => {
    const studioId = pick(config.studioIds);
    const packageId = pick(config.packageIds);
    return {
      user_id: p.id,
      studio_id: studioId,
      package_id: packageId,
      credits_remaining: randInt(0, 12),
      expires_at: addDays(now, randInt(14, 90)).toISOString(),
    };
  });

  const { error: passErr } = await supabase
    .from("student_passes")
    .insert(passRows);
  if (passErr) console.warn("Pass insert warning:", passErr.message);

  return {
    classCount: classRows.length,
    studentCount: studentProfiles.length,
    bookingCount: bookingRows.length,
    waitlistClassName: waitlistClass?.name ?? "none",
  };
}
