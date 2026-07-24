import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveOrCreateContact } from "@/lib/whatsapp/contact-link";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const { data: conversas, error } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone_number, display_name")
    .is("contact_id", null);

  if (error) {
    console.error("[backfill-contatos]", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as conversas." },
      { status: 500 }
    );
  }

  let processadas = 0;
  for (const conversa of conversas ?? []) {
    try {
      const contactId = await resolveOrCreateContact(
        supabase,
        conversa.phone_number,
        conversa.display_name
      );
      await supabase
        .from("whatsapp_conversations")
        .update({ contact_id: contactId })
        .eq("id", conversa.id);
      processadas++;
    } catch (err) {
      console.error("[backfill-contatos] conversa", conversa.id, err);
    }
  }

  return NextResponse.json({ processadas });
}
