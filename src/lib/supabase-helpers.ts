import { supabase } from "@/integrations/supabase/client";

export async function createStudioWithMembership(name: string, slug: string, location?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .insert({ name, slug, owner_id: user.id, location })
    .select()
    .single();

  if (studioError) throw studioError;

  const { error: memberError } = await supabase
    .from("studio_members")
    .insert({ user_id: user.id, studio_id: studio.id, role: "owner" as const });

  if (memberError) throw memberError;

  return studio;
}

export async function getUserStudios() {
  const { data, error } = await supabase
    .from("studio_members")
    .select(`
      studio_id,
      role,
      studios (
        id,
        name,
        slug,
        owner_id,
        created_at
      )
    `);

  if (error) throw error;
  return data;
}
