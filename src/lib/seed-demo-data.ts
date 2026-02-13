import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData() {
  const { data, error } = await supabase.functions.invoke("seed-demo-data");
  if (error) throw error;
  if (!data.success) throw new Error(data.error);
  return data;
}
