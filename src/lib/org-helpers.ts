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

export async function getOrgStudiosWithRevenue(orgId: string) {
  // 1. Fetch studios in this org
  const { data: studios, error: studioErr } = await supabase
    .from("studios")
    .select("id, name, slug, location")
    .eq("organization_id", orgId);

  if (studioErr) throw studioErr;
  if (!studios || studios.length === 0) return [];

  const studioIds = studios.map((s) => s.id);

  // 2. Fetch completed transactions for those studios
  const { data: transactions, error: txErr } = await supabase
    .from("transactions")
    .select("studio_id, amount")
    .in("studio_id", studioIds)
    .eq("status", "completed");

  if (txErr) throw txErr;

  // 3. Aggregate per studio
  const revenueMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  (transactions ?? []).forEach((t) => {
    revenueMap[t.studio_id] = (revenueMap[t.studio_id] ?? 0) + Number(t.amount);
    countMap[t.studio_id] = (countMap[t.studio_id] ?? 0) + 1;
  });

  return studios.map((s) => ({
    ...s,
    revenue: Math.round((revenueMap[s.id] ?? 0) * 100) / 100,
    transactions: countMap[s.id] ?? 0,
  }));
}
