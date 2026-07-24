import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapConversationRow, type DbConversationRow } from "@/lib/whatsapp/mapper";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*, whatsapp_messages(id, direction, sender, body, status, sent_at)")
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[whatsapp/conversas]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as conversas." },
      { status: 500 }
    );
  }

  const conversas = (data as DbConversationRow[]).map(mapConversationRow);
  return NextResponse.json({ conversas });
}
