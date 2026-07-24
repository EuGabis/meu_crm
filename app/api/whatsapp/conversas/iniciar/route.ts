import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizarParaJid, telefonesBatem } from "@/lib/whatsapp/contact-link";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contatoId = typeof body.contatoId === "string" ? body.contatoId : "";

  if (!contatoId) {
    return NextResponse.json({ error: "Contato é obrigatório." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: contato, error: contatoError } = await supabase
    .from("contacts")
    .select("id, nome, telefone")
    .eq("id", contatoId)
    .single();

  if (contatoError || !contato) {
    return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });
  }

  const jid = normalizarParaJid(contato.telefone);
  if (!jid) {
    return NextResponse.json(
      { error: "Verifique o telefone do contato." },
      { status: 400 }
    );
  }

  // 1) Conversa já vinculada a este contato
  const { data: porContato } = await supabase
    .from("whatsapp_conversations")
    .select("id")
    .eq("contact_id", contato.id)
    .limit(1)
    .maybeSingle();

  if (porContato) {
    return NextResponse.json({ conversaId: porContato.id });
  }

  // 2) Conversa cujo telefone bate por sufixo — vincula ao contato
  const { data: todas } = await supabase
    .from("whatsapp_conversations")
    .select("id, phone_number");

  const porTelefone = (todas ?? []).find((c) =>
    telefonesBatem(c.phone_number, contato.telefone)
  );

  if (porTelefone) {
    await supabase
      .from("whatsapp_conversations")
      .update({ contact_id: contato.id })
      .eq("id", porTelefone.id);
    return NextResponse.json({ conversaId: porTelefone.id });
  }

  // 3) Cria conversa nova, vazia, já vinculada
  const { data: nova, error: criaError } = await supabase
    .from("whatsapp_conversations")
    .insert({
      remote_jid: jid,
      phone_number: jid.split("@")[0],
      display_name: contato.nome,
      contact_id: contato.id,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (criaError) {
    console.error("[conversas/iniciar]", criaError);
    return NextResponse.json(
      { error: "Não foi possível iniciar a conversa." },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversaId: nova.id });
}
