import { supabase } from "@/integrations/supabase/client";

export async function createStudioWithMembership(name: string, slug: string, location?: string) {
  const { data, error } = await supabase.rpc("create_studio_with_membership", {
    _name: name,
    _slug: slug,
    _location: location ?? null,
  });

  if (error) throw error;
  return data; // returns the new studio UUID
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
        created_at,
        organization_id
      )
    `);

  if (error) throw error;
  return data;
}
