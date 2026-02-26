import { supabase } from "@/integrations/supabase/client";

export interface NextClassInstance {
  id: string;
  name: string;
  start_time: string;
  capacity: number;
  instructor_name: string | null;
  current_bookings: number;
}

/**
 * Finds the next available instance of a class (matched by name) at a given studio.
 *
 * Smart "Same Time" preference: if `preferredHour` is provided, classes at that
 * hour of day are prioritised. Falls back to the chronologically next available.
 *
 * @param className  – the class name to search for (acts as the "class type")
 * @param studioId   – studio to search within
 * @param afterDate  – only look at classes starting after this ISO string (defaults to now)
 * @param preferredHour – optional hour-of-day (0-23) to prefer
 */
export async function findNextClassInstance(
  className: string,
  studioId: string,
  afterDate?: string,
  preferredHour?: number,
): Promise<NextClassInstance | null> {
  const after = afterDate ?? new Date().toISOString();

  // Fetch upcoming classes with the same name at this studio
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, start_time, capacity_total, instructors:instructor_id(name)")
    .eq("studio_id", studioId)
    .eq("name", className)
    .gt("start_time", after)
    .order("start_time", { ascending: true })
    .limit(10); // fetch a handful so we can apply same-time preference

  if (error || !classes || classes.length === 0) return null;

  // For each candidate, count existing active bookings
  const candidates: (NextClassInstance & { hourOfDay: number })[] = [];

  for (const c of classes) {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("class_id", c.id)
      .in("status", ["confirmed", "waitlist"]);

    const currentBookings = count ?? 0;
    if (currentBookings >= c.capacity_total) continue; // full – skip

    candidates.push({
      id: c.id,
      name: c.name,
      start_time: c.start_time,
      capacity: c.capacity_total,
      instructor_name: (c.instructors as any)?.name ?? null,
      current_bookings: currentBookings,
      hourOfDay: new Date(c.start_time).getHours(),
    });

    // We only need the best match; once we have 2+ candidates we can decide
    if (candidates.length >= 5) break;
  }

  if (candidates.length === 0) return null;

  // Smart same-time preference
  if (preferredHour !== undefined) {
    const sameTime = candidates.find((c) => c.hourOfDay === preferredHour);
    if (sameTime) return sameTime;
  }

  // Fallback: chronologically first available
  return candidates[0];
}
