import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData(studioId?: string) {
  const { data, error } = await supabase.functions.invoke("seed-demo-data", {
    body: { studio_id: studioId },
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}
