import { supabase } from "@/integrations/supabase/client";

export async function getUserOrganizations() {
  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        slug,
        created_at
      )
    `);

  if (error) throw error;
  return data;
}

export async function getOrgStudiosWithMockRevenue(orgId: string) {
  const { data, error } = await supabase
    .from("studios")
    .select("id, name, slug, location, created_at")
    .eq("organization_id", orgId);

  if (error) throw error;

  // Mock revenue data until a payments table exists
  return (data ?? []).map((studio) => ({
    ...studio,
    revenue: Math.round(Math.random() * 8000 + 2000),
    bookings: Math.round(Math.random() * 150 + 30),
  }));
}
