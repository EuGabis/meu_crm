import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInstanceInfo } from "@/lib/evolution/client";

export async function refreshInstanceFromEvolution(): Promise<void> {
  const info = await getInstanceInfo();
  if (!info) return;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("whatsapp_instances").upsert(
    {
      evolution_instance_id: info.name,
      name: process.env.EVOLUTION_INSTANCE_NAME!,
      status: info.connectionStatus,
      phone_number: info.number,
      profile_name: info.profileName,
      profile_pic_url: info.profilePicUrl,
      last_connected_at:
        info.connectionStatus === "open" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );

  if (error) throw error;
}

export async function setInstanceStatus(status: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("whatsapp_instances").upsert(
    {
      name: process.env.EVOLUTION_INSTANCE_NAME!,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );
  if (error) throw error;
}
